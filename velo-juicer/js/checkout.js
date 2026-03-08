document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("checkout-form");
    const payBtn = document.getElementById("pay-btn");
    const successModal = document.getElementById("success-modal");
    const emailInput = document.getElementById("email");
    const successEmailSpan = document.getElementById("success-email");

    // Basic mock formatting for card number
    const cardNum = document.getElementById("card-num");
    if (cardNum) {
        cardNum.addEventListener("input", function (e) {
            let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let matches = val.match(/\d{4,16}/g);
            let match = matches && matches[0] || '';
            let parts = [];
            for (let i = 0, len = match.length; i < len; i += 4) {
                parts.push(match.substring(i, i + 4));
            }
            if (parts.length) {
                e.target.value = parts.join(' ');
            } else {
                e.target.value = val;
            }
        });
    }

    // Basic mock formatting for expiry
    const cardExp = document.getElementById("card-exp");
    if (cardExp) {
        cardExp.addEventListener("input", function (e) {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length >= 2) {
                e.target.value = val.substring(0, 2) + ' / ' + val.substring(2, 4);
            } else {
                e.target.value = val;
            }
        });
    }

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            // Basic validation check
            if (!form.checkValidity()) return;

            // Simulate network request
            payBtn.classList.add("is-loading");

            setTimeout(() => {
                payBtn.classList.remove("is-loading");

                // Show success modal
                if (emailInput && emailInput.value) {
                    successEmailSpan.textContent = emailInput.value;
                }
                successModal.classList.add("is-active");
            }, 2000);
        });
    }
});
