/**
 * Bootstrap 5 Modal Helper
 * This helper provides consistent methods for working with Bootstrap 5 modals
 */
window.ModalHelper = {
    /**
     * Get a Bootstrap 5 Modal instance
     * @param {string} modalId - The ID of the modal
     * @returns {Object|null} The Bootstrap Modal instance or null
     */
    getInstance: function(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return null;

        try {
            return bootstrap.Modal.getInstance(modalElement);
        } catch (error) {
            console.warn(`Could not get modal instance for ${modalId}:`, error);
            return null;
        }
    },

    /**
     * Create a new Bootstrap Modal instance
     * @param {string} modalId - The ID of the modal
     * @returns {Object|null} The Bootstrap Modal instance or null
     */
    createInstance: function(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return null;

        try {
            return new bootstrap.Modal(modalElement);
        } catch (error) {
            console.warn(`Could not create modal instance for ${modalId}:`, error);
            return null;
        }
    },

    /**
     * Show a modal
     * @param {string} modalId - The ID of the modal to show
     */
    show: function(modalId) {
        let modal = this.getInstance(modalId);
        if (!modal) {
            modal = this.createInstance(modalId);
        }

        if (modal) {
            modal.show();
        } else {
            console.error(`Could not show modal: ${modalId}`);
        }
    },

    /**
     * Hide a modal
     * @param {string} modalId - The ID of the modal to hide
     */
    hide: function(modalId) {
        const modal = this.getInstance(modalId);
        if (modal) {
            modal.hide();
        } else {
            // Fallback for when the instance isn't available
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                $(modalElement).removeClass('show');
                $(modalElement).css('display', 'none');
                $(modalElement).attr('aria-hidden', 'true');
                $(modalElement).removeAttr('aria-modal');

                // Remove backdrop
                $('.modal-backdrop').remove();

                // Remove modal-open class from body
                $('body').removeClass('modal-open');
                $('body').css('overflow', '');
                $('body').css('padding-right', '');
            }
        }
    },

    /**
     * Initialize all modals on the page
     */
    initializeAll: function() {
        // Update data attributes for Bootstrap 5
        document.querySelectorAll('[data-toggle="modal"]').forEach(element => {
            element.setAttribute('data-bs-toggle', 'modal');
            element.removeAttribute('data-toggle');
        });

        document.querySelectorAll('[data-dismiss="modal"]').forEach(element => {
            element.setAttribute('data-bs-dismiss', 'modal');
            element.removeAttribute('data-dismiss');
        });

        // Add event listeners to close buttons
        document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    window.ModalHelper.hide(modal.id);
                }
            });
        });
    }
};

// Legacy method for closing modals - as a fallback
window.closeModal = function(modalId) {
    // Try the helper first
    if (window.ModalHelper) {
        window.ModalHelper.hide(modalId);
        return;
    }

    // Fallback method
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        $(modalElement).removeClass('show');
        $(modalElement).css('display', 'none');
        $(modalElement).attr('aria-hidden', 'true');

        // Remove backdrop
        $('.modal-backdrop').remove();

        // Remove modal-open class from body
        $('body').removeClass('modal-open');
        $('body').css('overflow', '');
        $('body').css('padding-right', '');
    }
};

// Automatically initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    window.ModalHelper.initializeAll();
});