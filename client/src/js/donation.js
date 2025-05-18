// donation.js - Handles the donation functionality for Patriot Thanks

document.addEventListener('DOMContentLoaded', function() {
    // Variables to track donation amount and payment method
    let selectedAmount = 0;
    let paymentMethod = 'paypal';

    // Get DOM elements
    const donationBtns = document.querySelectorAll('.donation-btn');
    const customAmountInput = document.getElementById('custom-amount');
    const donationForm = document.getElementById('donation-form');
    const donateBtn = document.getElementById('donate-btn');
    const paypalRadio = document.getElementById('payment-paypal');
    const cardRadio = document.getElementById('payment-card');
    const cardPaymentForm = document.getElementById('card-payment-form');

    // Initialize PayPal SDK
    function initPayPal() {
        // This would typically load the PayPal SDK
        console.log('PayPal SDK initialized');
        // In a real implementation, you would include the PayPal SDK script
        // and configure it with your client ID
    }

    // Initialize the page
    function init() {
        // Set default donation amount to first button
        if (donationBtns.length > 0) {
            selectDonationAmount(donationBtns[0]);
        }

        // Initialize PayPal
        initPayPal();

        // Add event listeners
        addEventListeners();
    }

    // Add all event listeners
    function addEventListeners() {
        // Donation amount buttons
        donationBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                selectDonationAmount(this);
                customAmountInput.value = '';
            });
        });

        // Custom amount input
        customAmountInput.addEventListener('input', function() {
            const amount = parseFloat(this.value);
            if (amount > 0) {
                // Deselect all buttons
                donationBtns.forEach(btn => btn.classList.remove('active', 'btn-primary'));
                donationBtns.forEach(btn => btn.classList.add('btn-outline-primary'));

                // Set the custom amount
                selectedAmount = amount;
                updateDonateButtonText();
            } else if (this.value === '') {
                // If input is cleared, default to first donation button
                if (donationBtns.length > 0) {
                    selectDonationAmount(donationBtns[0]);
                }
            }
        });

        // Payment method toggle
        paypalRadio.addEventListener('change', togglePaymentMethod);
        cardRadio.addEventListener('change', togglePaymentMethod);

        // Donation form submission
        donationForm.addEventListener('submit', handleDonationSubmit);
    }

    // Select a donation amount
    function selectDonationAmount(btn) {
        // Deselect all buttons
        donationBtns.forEach(button => {
            button.classList.remove('active', 'btn-primary');
            button.classList.add('btn-outline-primary');
        });

        // Select the clicked button
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-outline-primary');

        // Set the amount
        selectedAmount = parseFloat(btn.getAttribute('data-amount'));

        // Update donate button text
        updateDonateButtonText();
    }

    // Toggle between payment methods
    function togglePaymentMethod() {
        if (cardRadio.checked) {
            paymentMethod = 'card';
            cardPaymentForm.style.display = 'block';
        } else {
            paymentMethod = 'paypal';
            cardPaymentForm.style.display = 'none';
        }
    }

    // Update the donate button text to show the amount
    function updateDonateButtonText() {
        if (selectedAmount > 0) {
            donateBtn.textContent = `Donate $${selectedAmount.toFixed(2)}`;
        } else {
            donateBtn.textContent = 'Complete Donation';
        }
    }

    // Handle donation form submission
    function handleDonationSubmit(event) {
        event.preventDefault();

        // Validate donation amount
        if (selectedAmount <= 0) {
            if (customAmountInput.value) {
                selectedAmount = parseFloat(customAmountInput.value);
            }

            if (selectedAmount <= 0) {
                alert('Please select or enter a valid donation amount.');
                return;
            }
        }

        // Get form data
        const formData = {
            amount: selectedAmount,
            name: document.getElementById('donor-name').value,
            email: document.getElementById('donor-email').value,
            anonymous: document.getElementById('anonymous-donation').checked,
            recurring: document.getElementById('recurring-donation').checked,
            message: document.getElementById('donor-message').value,
            paymentMethod: paymentMethod
        };

        // Add credit card data if paying by card
        if (paymentMethod === 'card') {
            formData.card = {
                name: document.getElementById('card-name').value,
                number: document.getElementById('card-number').value,
                expiry: document.getElementById('card-expiry').value,
                cvc: document.getElementById('card-cvc').value
            };

            // Basic validation for credit card
            if (!formData.card.name || !formData.card.number || !formData.card.expiry || !formData.card.cvc) {
                alert('Please fill in all credit card details.');
                return;
            }
        }

        // Basic validation for required fields
        if (!formData.name || !formData.email) {
            alert('Please provide your name and email.');
            return;
        }

        // In a real implementation, you would:
        // 1. Send this data to your server securely
        // 2. Process the payment via PayPal or a payment processor
        // 3. Store donation record in your database

        // For now, we'll simulate a successful donation
        console.log('Processing donation:', formData);

        // Show processing state
        donateBtn.textContent = 'Processing...';
        donateBtn.disabled = true;

        // Simulate API call with timeout
        setTimeout(function() {
            // Redirect to thank you page or show success message
            showDonationSuccess(formData);
        }, 2000);
    }

    // Show donation success message
    function showDonationSuccess(formData) {
        // Create the success message
        const mainContent = document.querySelector('main .row');
        mainContent.innerHTML = `
            <div class="col-lg-8 mx-auto">
                <div class="card shadow border-success">
                    <div class="card-header bg-success text-white">
                        <h2 class="mb-0">Thank You for Your Support!</h2>
                    </div>
                    <div class="card-body text-center">
                        <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                        <h3 class="mt-4">Your donation of $${formData.amount.toFixed(2)} has been received</h3>
                        <p class="lead">Your support helps us continue connecting heroes with businesses that appreciate their service.</p>
                        
                        <div class="mt-4 mb-4">
                            <p>A confirmation email has been sent to: <strong>${formData.email}</strong></p>
                            ${formData.recurring ? '<p><strong>Your donation will recur monthly.</strong> You can cancel at any time by contacting us.</p>' : ''}
                        </div>
                        
                        <div class="mt-4">
                            <a href="index.html" class="btn btn-primary me-2">Return to Home</a>
                            <a href="contact.html" class="btn btn-outline-primary">Contact Us</a>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <p>Problem with your donation? Please <a href="contact.html">contact us</a> for assistance.</p>
                </div>
            </div>
        `;

        // In a real implementation, you would:
        // 1. Store donation in the database
        // 2. Send a confirmation email
        // 3. Update donation statistics

        console.log('Donation completed successfully');
    }

    // Initialize the page
    init();
});