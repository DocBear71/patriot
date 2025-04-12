<?php
// Set headers to handle CORS and JSON
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Get raw posted data
$data = json_decode(file_get_contents("php://input"), true);

// Validate data
if (
    empty($data['fname']) ||
    empty($data['lname']) ||
    empty($data['address1']) ||
    empty($data['city']) ||
    empty($data['state']) ||
    empty($data['zip']) ||
    empty($data['status']) ||
    empty($data['email']) ||
    empty($data['password']) ||
    empty($data['psw_repeat'])
) {
    // Return error response
    http_response_code(400);
    echo json_encode(["message" => "Missing required fields"]);
    exit;
}

// Optional: Hash the password for security
// If you're storing plain text passwords in MongoDB (not recommended),
// comment these lines out
$data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
$data['psw_repeat'] = password_hash($data['psw_repeat'], PASSWORD_DEFAULT);

try {
    // Connect to MongoDB
    $mongoClient = new MongoDB\Client("mongodb+srv://DocBear:1369Butterfly81!!@cluster0.8jjmw.mongodb.net/patriot?retryWrites=true&w=majority&appName=Cluster0");

    // Select database and collection
    $database = $mongoClient->patriotThanks;
    $collection = $database->users;

    // Check if email already exists
    $existingUser = $collection->findOne(['email' => $data['email']]);
    if ($existingUser) {
        http_response_code(400);
        echo json_encode(["message" => "Email already registered"]);
        exit;
    }

    // Insert document
    $result = $collection->insertOne($data);

    if ($result->getInsertedCount() > 0) {
        // Return success response
        http_response_code(201);
        echo json_encode([
            "message" => "User registered successfully",
            "id" => (string)$result->getInsertedId()
        ]);
    } else {
        // Return error response
        http_response_code(503);
        echo json_encode(["message" => "Unable to register user"]);
    }
} catch (Exception $e) {
    // Return error response
    http_response_code(500);
    echo json_encode([
        "message" => "Database error",
        "error" => $e->getMessage()
    ]);
}
?>