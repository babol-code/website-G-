// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.getElementById('nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('show');
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', !isExpanded);
    });
}

// Language Toggle Logic (TR default, NL secondary)
const langToggleBtn = document.getElementById('lang-toggle');

let currentLang = localStorage.getItem('biromur_lang') || 'tr';
document.body.classList.add(currentLang);

if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
        document.body.classList.remove(currentLang);
        currentLang = currentLang === 'tr' ? 'nl' : 'tr';
        document.body.classList.add(currentLang);
        localStorage.setItem('biromur_lang', currentLang);
    });
}

// Fade-In Scroll Animation
const fadeElements = document.querySelectorAll('.fade-in');

const appearOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        } else {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, appearOptions);

fadeElements.forEach(el => {
    appearOnScroll.observe(el);
});

// Sticky Header Styling on Scroll
const header = document.getElementById('main-header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.boxShadow = "0 4px 15px rgba(0,0,0,0.03)";
    } else {
        header.style.boxShadow = "0 1px 0 rgba(0,0,0,0.05)";
    }
});
