document.addEventListener('DOMContentLoaded', function() {
    console.log("Password validation script loaded");

    // Password matching validation
    const submitButton = document.getElementById('submit');
    if (submitButton) {
        submitButton.disabled = true;
    }

    // Get all the elements
    var myInput = document.getElementById("psw");
    var confirmInput = document.getElementById("psw_repeat");
    var messageBox = document.getElementById("message");

    // Password validation criteria elements
    var letter = document.getElementById("letter");
    var capital = document.getElementById("capital");
    var number = document.getElementById("number");
    var length = document.getElementById("length");
    var special = document.getElementById("special");
    var match = document.getElementById("match");

    // Exit if elements don't exist (we're not on the registration page)
    if (!myInput || !confirmInput || !messageBox) {
        console.log("Not on a page with password validation elements");
        return;
    }

    console.log("Password validation elements found");

    // Initially hide the match status
    if (match) {
        match.style.display = "none";
    }

    // Show all password requirements when password field is focused
    myInput.onfocus = function() {
        messageBox.style.display = "block";
        if (match) {
            match.style.display = "none"; // Hide match status when focusing on password
        }
    }

    // When confirm password field is focused, show match status
    confirmInput.onfocus = function() {
        messageBox.style.display = "block";
        if (match) {
            match.style.display = "block"; // Show match status
        }
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
        if (!match) return;

        var password = myInput.value;
        var confirmPassword = confirmInput.value;

        if (password === "" || confirmPassword === "") {
            // Don't show match status if either field is empty
            match.classList.remove("valid");
            match.classList.add("invalid");

            if (submitButton) {
                submitButton.disabled = true;
            }
        } else if (password != confirmPassword) {
            match.classList.remove("valid");
            match.classList.add("invalid");

            if (submitButton) {
                submitButton.disabled = true;
            }
        } else {
            match.classList.remove("invalid");
            match.classList.add("valid");

            // Only enable submit if all criteria are met
            if (checkAllCriteria()) {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        }
    }

    // Check password match when either field changes
    if (myInput && confirmInput) {
        myInput.addEventListener('keyup', updatePasswordMatch);
        confirmInput.addEventListener('keyup', updatePasswordMatch);
    }

    // Function to check if all criteria are met
    function checkAllCriteria() {
        if (!letter || !capital || !number || !special || !length || !match) {
            return false;
        }

        return letter.classList.contains("valid") &&
            capital.classList.contains("valid") &&
            number.classList.contains("valid") &&
            special.classList.contains("valid") &&
            length.classList.contains("valid") &&
            match.classList.contains("valid");
    }

    // Function to validate password - can be called from other scripts
    window.validatePassword = function(password) {
        // Validate lowercase letters
        var lowerCaseLetters = /[a-z]/g;
        var hasLower = lowerCaseLetters.test(password);

        // Validate capital letters
        var upperCaseLetters = /[A-Z]/g;
        var hasUpper = upperCaseLetters.test(password);

        // Validate numbers
        var numbers = /[0-9]/g;
        var hasNumber = numbers.test(password);

        // Validate special characters
        var specialChars = /[!@#$%^&*]/g;
        var hasSpecial = specialChars.test(password);

        // Validate length
        var hasLength = password.length >= 8;

        return {
            isValid: hasLower && hasUpper && hasNumber && hasSpecial && hasLength,
            criteria: {
                hasLower,
                hasUpper,
                hasNumber,
                hasSpecial,
                hasLength
            }
        };
    };

    // When the user starts to type something inside the password field
    if (myInput) {
        myInput.onkeyup = function() {
            if (!letter || !capital || !number || !special || !length) {
                return;
            }

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
                if (submitButton) {
                    submitButton.disabled = false;
                }
            } else {
                if (submitButton) {
                    submitButton.disabled = true;
                }
            }

            // Also update match status
            updatePasswordMatch();
        }
    }
});