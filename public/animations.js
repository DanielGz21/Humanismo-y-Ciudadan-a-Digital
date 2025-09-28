document.addEventListener('DOMContentLoaded', () => {
    const animationElements = document.querySelectorAll('.animate-on-scroll');

    if (!animationElements.length) {
        return;
    }

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the element is visible
    });

    animationElements.forEach(element => {
        observer.observe(element);
    });
});
