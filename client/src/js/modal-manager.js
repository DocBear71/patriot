// modal-manager.js

/**
 * Modal Management System for Bootstrap 5
 * Provides a clean API for working with modals
 */
let ModalManager = {
    /**
     * Get a modal instance
     * @param {string} modalId - The ID of the modal
     * @returns {bootstrap.Modal} - The modal instance
     */
    getModal(modalId) {
        const element = document.getElementById(modalId);
        if (!element) {
            console.error(`Modal element with ID ${modalId} not found`);
            return null;
        }

        // Return existing instance or create new one
        return bootstrap.Modal.getInstance(element) || new bootstrap.Modal(element);
    },

    /**
     * Show a modal
     * @param {string} modalId - The ID of the modal to show
     * @param {object} options - Options for the modal
     */
    show(modalId, options = {}) {
        try {
            // Clean up any previous modal issues
            this.cleanupModals();

            const element = document.getElementById(modalId);
            if (!element) {
                console.error(`Modal element with ID ${modalId} not found`);
                return;
            }

            // Set options as data attributes
            if (options.backdrop !== undefined) {
                element.setAttribute('data-bs-backdrop', options.backdrop);
            }

            if (options.keyboard !== undefined) {
                element.setAttribute('data-bs-keyboard', options.keyboard);
            }

            if (options.focus !== undefined) {
                element.setAttribute('data-bs-focus', options.focus);
            }

            // Get or create the modal
            const modal = bootstrap.Modal.getInstance(element) ||
                new bootstrap.Modal(element, options);

            // Show the modal
            modal.show();

            // Set up emergency reset if requested
            if (options.emergencyReset) {
                this.setupEmergencyReset(modalId, options.resetDelay || 10000);
            }

            console.log(`Modal ${modalId} shown`);
        } catch (error) {
            console.error(`Error showing modal ${modalId}:`, error);
            this.manualShowModal(modalId);
        }
    },

    /**
     * Hide a modal
     * @param {string} modalId - The ID of the modal to hide
     */
    hide(modalId) {
        try {
            const modal = this.getModal(modalId);
            if (modal) {
                modal.hide();
                console.log(`Modal ${modalId} hidden`);
            } else {
                this.manualHideModal(modalId);
            }
        } catch (error) {
            console.error(`Error hiding modal ${modalId}:`, error);
            this.manualHideModal(modalId);
        }
    },

    /**
     * Manually show a modal if Bootstrap API fails
     * @param {string} modalId - The ID of the modal
     */
    manualShowModal(modalId) {
        console.log(`Manually showing modal ${modalId}`);
        const element = document.getElementById(modalId);
        if (!element) return;

        // Add classes
        element.classList.add('show');
        element.style.display = 'block';
        element.setAttribute('aria-modal', 'true');
        element.setAttribute('role', 'dialog');
        element.removeAttribute('aria-hidden');

        // Add backdrop
        if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.classList.add('modal-backdrop', 'fade', 'show');
            document.body.appendChild(backdrop);
        }

        // Adjust body
        document.body.classList.add('modal-open');
    },

    /**
     * Manually hide a modal if Bootstrap API fails
     * @param {string} modalId - The ID of the modal
     */
    manualHideModal(modalId) {
        console.log(`Manually hiding modal ${modalId}`);
        const element = document.getElementById(modalId);
        if (!element) return;

        // Remove classes
        element.classList.remove('show');
        element.style.display = 'none';
        element.setAttribute('aria-hidden', 'true');
        element.removeAttribute('aria-modal');
        element.removeAttribute('role');

        this.cleanupModals();
    },

    /**
     * Clean up modal artifacts
     */
    cleanupModals() {
        // Remove backdrops
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

        // Fix body
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
    },

    /**
     * Set up an emergency reset button
     * @param {string} modalId - The ID of the modal
     * @param {number} delay - Delay in ms before showing button
     */
    setupEmergencyReset(modalId, delay = 10000) {
        setTimeout(() => {
            const modal = document.getElementById(modalId);
            if (modal && modal.classList.contains('show')) {
                this.showEmergencyButton(modalId);
            }
        }, delay);
    },

    /**
     * Show emergency reset button
     * @param {string} modalId - The ID of the modal to reset
     */
    showEmergencyButton(modalId) {
        // Create button if it doesn't exist
        let btn = document.getElementById('emergencyResetBtn');

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'emergencyResetBtn';
            btn.textContent = 'Emergency Reset';

            // Style button
            Object.assign(btn.style, {
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                zIndex: '9999',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            });

            // Add event listener
            btn.addEventListener('click', () => {
                this.emergencyReset(modalId);
                btn.style.display = 'none';
            });

            document.body.appendChild(btn);
        }

        btn.style.display = 'block';
    },

    /**
     * Perform emergency reset
     * @param {string} modalId - The ID of the modal to reset
     */
    emergencyReset(modalId) {
        console.log(`Emergency reset for modal ${modalId}`);

        // Try standard hide first
        try {
            this.hide(modalId);
        } catch (error) {
            console.error('Standard hide failed during emergency reset:', error);
        }

        // Force cleanup
        this.cleanupModals();

        // Force hide modal
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
            modal.removeAttribute('role');
        }

        // Remove emergency button
        const btn = document.getElementById('emergencyResetBtn');
        if (btn) btn.style.display = 'none';

        return true;
    }
};

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}

// Make available globally
window.ModalManager = ModalManager;