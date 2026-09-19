// Scroll-to-bottom arrow: only shows when the page is actually taller
// than the viewport, and disappears once you've scrolled (or clicked it)
// down to the bottom of the page.
document.addEventListener('DOMContentLoaded', function () {
    var arrow = document.createElement('div');
    arrow.className = 'scroll-arrow is-hidden';
    arrow.id = 'scroll-arrow';
    arrow.setAttribute('role', 'button');
    arrow.setAttribute('aria-label', 'Sayfanın altına in / Naar beneden scrollen');
    arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
    document.body.appendChild(arrow);

    function nearBottom() {
        var scrollY = window.scrollY || window.pageYOffset;
        return (window.innerHeight + scrollY) >= (document.documentElement.scrollHeight - 40);
    }

    function isScrollable() {
        return document.documentElement.scrollHeight > window.innerHeight + 80;
    }

    function update() {
        if (isScrollable() && !nearBottom()) {
            arrow.classList.remove('is-hidden');
        } else {
            arrow.classList.add('is-hidden');
        }
    }

    arrow.addEventListener('click', function () {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        arrow.classList.add('is-hidden');
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    setTimeout(update, 300); // catch late-loading images/fonts changing page height
});
