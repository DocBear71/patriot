// // login-form-validator.js - Handles validation of login form in navbar dropdown
// document.addEventListener('DOMContentLoaded', function() {
//     console.log("Login form validator loaded");
//
//     // Get the login form and its elements
//     const loginForm = document.querySelector('.dropdown-menu form');
//
//     // Exit if the form doesn't exist
//     if (!loginForm) {
//         console.log("Login form not found");
//         return;
//     }
//
//     console.log("Login form found");
//
//     // Get form elements
//     const emailInput = document.getElementById('DropdownFormEmail1');
//     const passwordInput = document.getElementById('DropdownFormPassword1');
//     const loginButton = loginForm.querySelector('button[type="submit"]');
//
//     // Add validation listener for email
//     if (emailInput) {
//         emailInput.addEventListener('input', validateForm);
//     }
//
//     // Add validation listener for password
//     if (passwordInput) {
//         passwordInput.addEventListener('input', validateForm);
//     }
//
//     // Add form submission handler
//     if (loginForm) {
//         loginForm.addEventListener('submit', function(event) {
//             // Prevent the default form submission
//             event.preventDefault();
//
//             // Revalidate form
//             if (validateForm()) {
//                 // If valid, attempt login
//                 const email = emailInput.value;
//                 const password = passwordInput.value;
//                 const rememberMe = document.getElementById('dropdownCheck')?.checked || false;
//
//                 // Use the login function from login-handler.js
//                 if (typeof loginUser === 'function') {
//                     loginUser(email, password, rememberMe);
//                 } else {
//                     console.error("loginUser function not found. Make sure login-handler.js is loaded before this script.");
//                     alert("Login functionality is not available. Please try again later.");
//                 }
//             }
//         });
//     }
//
//     // Form validation function
//     function validateForm() {
//         if (!emailInput || !passwordInput || !loginButton) {
//             return false;
//         }
//
//         let isValid = true;
//
//         // Validate email format
//         const emailValue = emailInput.value.trim();
//         const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         const isEmailValid = emailPattern.test(emailValue);
//
//         if (!isEmailValid) {
//             emailInput.classList.add('is-invalid');
//             isValid = false;
//         } else {
//             emailInput.classList.remove('is-invalid');
//             emailInput.classList.add('is-valid');
//         }
//
//         // Validate password (simple non-empty check for login)
//         const passwordValue = passwordInput.value;
//         if (passwordValue.length === 0) {
//             passwordInput.classList.add('is-invalid');
//             isValid = false;
//         } else {
//             passwordInput.classList.remove('is-invalid');
//             passwordInput.classList.add('is-valid');
//         }
//
//         // Enable/disable submit button
//         loginButton.disabled = !isValid;
//
//         return isValid;
//     }
//
//     // Initial validation
//     validateForm();
// });