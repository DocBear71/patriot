document.addEventListener('DOMContentLoaded', function() {
    // Password matching validation
    $('#submit').prop('disabled', true);

    // Get all the elements
    var myInput = document.getElementById("psw");
    var confirmInput = document.getElementById("psw_repeat");
    var messageBox = document.getElementById("message");
    var letter = document.getElementById("letter");
    var capital = document.getElementById("capital");
    var number = document.getElementById("number");
    var length = document.getElementById("length");
    var special = document.getElementById("special");
    var match = document.getElementById("match");

    // Initially hide the match status
    match.style.display = "none";

    // Show all password requirements when password field is focused
    myInput.onfocus = function() {
        messageBox.style.display = "block";
        match.style.display = "none"; // Hide match status when focusing on password
    }

    // When confirm password field is focused, show match status
    confirmInput.onfocus = function() {
        messageBox.style.display = "block";
        match.style.display = "block"; // Show match status
    }

    // Hide message box when clicking outside both password fields
    myInput.onblur = function() {
        if (document.activeElement !== confirmInput) {
            messageBox.style.display = "none";
        }
    }

    confirmInput.onblur = function() {
        if (document.activeElement !== myInput) {
            messageBox.style.display = "none";
        }
    }

    // Update password match status
    function updatePasswordMatch() {
        var password = $("#psw").val();
        var confirmPassword = $("#psw_repeat").val();

        if (password === "" || confirmPassword === "") {
            // Don't show match status if either field is empty
            match.classList.remove("valid");
            match.classList.add("invalid");

        } else if (password != confirmPassword) {
            match.classList.remove("valid");
            match.classList.add("invalid");

            $('#submit').prop('disabled', true);
        } else {
            match.classList.remove("invalid");
            match.classList.add("valid");


            // Only enable submit if all criteria are met
            if (checkAllCriteria()) {
                $('#submit').prop('disabled', false);
            }
        }
    }

    // Check password match when either field changes
    $('#psw, #psw_repeat').on('keyup', updatePasswordMatch);

    // Function to check if all criteria are met
    function checkAllCriteria() {
        return letter.classList.contains("valid") &&
            capital.classList.contains("valid") &&
            number.classList.contains("valid") &&
            special.classList.contains("valid") &&
            length.classList.contains("valid") &&
            match.classList.contains("valid");
    }

    // When the user starts to type something inside the password field
    myInput.onkeyup = function() {
        // Validate lowercase letters
        var lowerCaseLetters = /[a-z]/g;
        if(myInput.value.match(lowerCaseLetters)) {
            letter.classList.remove("invalid");
            letter.classList.add("valid");
        } else {
            letter.classList.remove("valid");
            letter.classList.add("invalid");
        }

        // Validate capital letters
        var upperCaseLetters = /[A-Z]/g;
        if(myInput.value.match(upperCaseLetters)) {
            capital.classList.remove("invalid");
            capital.classList.add("valid");
        } else {
            capital.classList.remove("valid");
            capital.classList.add("invalid");
        }

        // Validate numbers
        var numbers = /[0-9]/g;
        if(myInput.value.match(numbers)) {
            number.classList.remove("invalid");
            number.classList.add("valid");
        } else {
            number.classList.remove("valid");
            number.classList.add("invalid");
        }

        // Validate special characters
        var specialChars = /[!@#$%^&*]/g;
        if(myInput.value.match(specialChars)) {
            special.classList.remove("invalid");
            special.classList.add("valid");
        } else {
            special.classList.remove("valid");
            special.classList.add("invalid");
        }

        // Validate length
        if(myInput.value.length >= 8) {
            length.classList.remove("invalid");
            length.classList.add("valid");
        } else {
            length.classList.remove("valid");
            length.classList.add("invalid");
        }

        // Check if all criteria are met to enable submit button
        if (checkAllCriteria()) {
            $('#submit').prop('disabled', false);
        } else {
            $('#submit').prop('disabled', true);
        }

        // Also update match status (but don't modify divCheckPassword here)
        updatePasswordMatch();
    }
});