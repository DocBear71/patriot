<?php
// contact.php - Processes the contact form and sends an email

// Set error reporting for debugging (remove in production)
// error_reporting(E_ALL);
// ini_set('display_errors', 1);

// Set your email address where you want to receive messages
$recipient_email = "edward-mckeown@student.kirkwood.edu"; // Replace with your email

// Get form data and sanitize
$first_name = filter_input(INPUT_POST, 'firstname', FILTER_SANITIZE_STRING);
$last_name = filter_input(INPUT_POST, 'lastname', FILTER_SANITIZE_STRING);
$email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
$subject_content = filter_input(INPUT_POST, 'subject', FILTER_SANITIZE_STRING);

// Validate required fields
if (empty($first_name) || empty($last_name) || empty($email) || empty($subject_content)) {
    http_response_code(400); // Bad request
    echo "Please fill in all required fields.";
    exit;
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo "Please enter a valid email address.";
    exit;
}

// Create email headers
$headers = "From: $first_name $last_name <$email>" . "\r\n";
$headers .= "Reply-To: $email" . "\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8" . "\r\n";

// Set email subject
$email_subject = "Patriot Thanks Contact Form: " . substr($subject_content, 0, 30) . "...";

// Construct the email message
$email_body = "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #003366; }
        .info { margin-bottom: 20px; }
        .label { font-weight: bold; }
        .message { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #003366; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>New Message from Patriot Thanks Contact Form</h1>
        <div class='info'>
            <p><span class='label'>Name:</span> $first_name $last_name</p>
            <p><span class='label'>Email:</span> $email</p>
        </div>
        <div class='message'>
            <p><span class='label'>Message:</span></p>
            <p>" . nl2br(htmlspecialchars($subject_content)) . "</p>
        </div>
    </div>
</body>
</html>
";

// Send the email
$mail_success = mail($recipient_email, $email_subject, $email_body, $headers);

// Return response
if ($mail_success) {
    http_response_code(200);
    echo "Thank you for your message. We will get back to you soon!";
} else {
    http_response_code(500);
    echo "Sorry, there was an error sending your message. Please try again later.";

    // Log error for debugging
    error_log("Failed to send email from contact form. From: $email, Subject: $email_subject");
}
?>