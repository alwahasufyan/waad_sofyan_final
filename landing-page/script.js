/**
 * TBA WAAD Landing Page - Interactive Scripts
 * ============================================
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all components
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
    initScrollAnimations();
    initContactForm();
    initStatsCounter();
    initParallaxEffects();
    initThemeToggle();
});

/**
 * Navbar Scroll Effect
 */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    function handleScroll() {
        const currentScroll = window.pageYOffset;

        // Add scrolled class when page is scrolled
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }

    // Throttle scroll event
    let ticking = false;
    window.addEventListener('scroll', function () {
        if (!ticking) {
            window.requestAnimationFrame(function () {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Initial check
    handleScroll();
}

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = mobileMenu.querySelectorAll('.mobile-link');
    const mobileBtn = mobileMenu.querySelector('.btn');
    let isOpen = false;

    function toggleMenu() {
        isOpen = !isOpen;
        mobileMenu.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';

        // Update icon
        const icon = menuToggle.querySelector('i');
        icon.className = isOpen ? 'ph ph-x' : 'ph ph-list';
    }

    function closeMenu() {
        isOpen = false;
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
        menuToggle.querySelector('i').className = 'ph ph-list';
    }

    menuToggle.addEventListener('click', toggleMenu);

    // Close menu when clicking links
    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    if (mobileBtn) {
        mobileBtn.addEventListener('click', closeMenu);
    }

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) {
            closeMenu();
        }
    });

    // Close menu on window resize
    window.addEventListener('resize', function () {
        if (window.innerWidth > 1024 && isOpen) {
            closeMenu();
        }
    });
}

/**
 * Smooth Scroll for Anchor Links
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Skip if it's just "#"
            if (href === '#') return;

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();

                const navbarHeight = document.getElementById('navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Scroll-triggered Animations
 */
function initScrollAnimations() {
    // Elements to animate
    const animatedElements = document.querySelectorAll(
        '.feature-card, .portal-card, .about-feature, .security-item, .coming-card, .contact-card, .stat-item'
    );

    // Section headers
    const sectionHeaders = document.querySelectorAll('.section-header');

    // Set initial styles
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    sectionHeaders.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    // Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger animation delay
                const delay = index * 100;

                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, delay);

                // Unobserve after animation
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe all animated elements
    animatedElements.forEach(el => observer.observe(el));
    sectionHeaders.forEach(el => observer.observe(el));
}

/**
 * Stats Counter Animation
 */
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');

    function animateValue(element, start, end, duration, suffix = '') {
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease out cubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            const current = Math.floor(start + (end - start) * easeProgress);
            element.textContent = current.toLocaleString('ar-SA') + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                // Final value
                element.textContent = end.toLocaleString('ar-SA') + suffix;
            }
        }

        requestAnimationFrame(update);
    }

    function parseStatValue(text) {
        // Remove Arabic numerals and convert to number
        const cleaned = text.replace(/[^\d.٫٠-٩]/g, '')
            .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

        const number = parseFloat(cleaned) || 0;
        const suffix = text.replace(/[\d٠-٩,.٫]/g, '').trim();

        return { number, suffix };
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const originalText = element.textContent;

                // Parse the stat value
                let endValue = 0;
                let suffix = '';

                if (originalText.includes('10,000') || originalText.includes('+10,000')) {
                    endValue = 10000;
                    suffix = '+';
                } else if (originalText.includes('50') && originalText.includes('+')) {
                    endValue = 50;
                    suffix = '+';
                } else if (originalText.includes('99.9')) {
                    endValue = 99.9;
                    suffix = '%';
                }

                if (endValue > 0) {
                    element.textContent = '0' + suffix;

                    // Delay for stagger effect
                    setTimeout(() => {
                        if (endValue === 99.9) {
                            // Special handling for percentage
                            animateDecimal(element, 0, 99.9, 2000, '%');
                        } else {
                            animateValue(element, 0, endValue, 2000, suffix);
                        }
                    }, 200);
                }

                observer.unobserve(element);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => observer.observe(el));

    function animateDecimal(element, start, end, duration, suffix) {
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            const current = (start + (end - start) * easeProgress).toFixed(1);
            element.textContent = current + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = end + suffix;
            }
        }

        requestAnimationFrame(update);
    }
}

/**
 * Contact Form Handling
 */
function initContactForm() {
    const form = document.getElementById('contactForm');

    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnContent = submitBtn.innerHTML;

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <i class="ph ph-spinner" style="animation: spin 1s linear infinite;"></i>
            جاري الإرسال...
        `;

        // Add spin animation style
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        // Simulate form submission (replace with actual API call)
        setTimeout(() => {
            // Show success message
            submitBtn.innerHTML = `
                <i class="ph ph-check-circle"></i>
                تم إرسال الرسالة بنجاح!
            `;
            submitBtn.style.background = 'linear-gradient(135deg, #00c9a7 0%, #00a186 100%)';

            // Reset form
            form.reset();

            // Reset button after delay
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
                submitBtn.style.background = '';
            }, 3000);

        }, 1500);
    });

    // Form validation visual feedback
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        input.addEventListener('blur', function () {
            if (this.value && this.checkValidity()) {
                this.style.borderColor = 'var(--secondary-500)';
            } else if (this.value && !this.checkValidity()) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '';
            }
        });

        input.addEventListener('focus', function () {
            this.style.borderColor = '';
        });
    });
}

/**
 * Parallax Effects
 */
function initParallaxEffects() {
    const heroGlow = document.querySelector('.hero-glow');
    const floatingCards = document.querySelectorAll('.floating-card');

    if (!heroGlow) return;

    let ticking = false;

    function handleMouseMove(e) {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const x = (e.clientX / window.innerWidth - 0.5) * 20;
                const y = (e.clientY / window.innerHeight - 0.5) * 20;

                // Move hero glow
                if (heroGlow) {
                    heroGlow.style.transform = `translate(${x}px, ${y}px)`;
                }

                // Move floating cards (opposite direction for depth)
                floatingCards.forEach((card, index) => {
                    const factor = (index + 1) * 0.5;
                    card.style.transform = `translate(${-x * factor}px, ${-y * factor}px)`;
                });

                ticking = false;
            });
            ticking = true;
        }
    }

    // Only enable on desktop
    if (window.innerWidth > 1024) {
        document.addEventListener('mousemove', handleMouseMove);
    }

    // Disable on resize to mobile
    window.addEventListener('resize', function () {
        if (window.innerWidth <= 1024) {
            heroGlow.style.transform = '';
            floatingCards.forEach(card => {
                card.style.transform = '';
            });
        }
    });
}

/**
 * Utility: Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Utility: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Portal Cards Hover Effect
 */
document.querySelectorAll('.portal-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.setProperty('--hover-scale', '1.02');
    });

    card.addEventListener('mouseleave', function () {
        this.style.setProperty('--hover-scale', '1');
    });
});

/**
 * Navbar Active Link Highlighting
 */
function initActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function highlightNav() {
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', throttle(highlightNav, 100));
}

// Initialize active nav link highlighting
initActiveNavLink();

/**
 * Preloader (optional)
 */
window.addEventListener('load', function () {
    document.body.classList.add('loaded');

    // Trigger initial animations
    const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-description, .hero-actions, .hero-stats');
    heroElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100 + (index * 150));
    });
});

/**
 * Theme Toggle Functionality
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    const icon = themeToggle ? themeToggle.querySelector('i') : null;

    // Check for saved preference
    const savedTheme = localStorage.getItem('theme');

    // Check system preference if no saved theme
    const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

    // Set initial theme
    if (savedTheme === 'light' || (!savedTheme && systemPrefersLight)) {
        html.setAttribute('data-theme', 'light');
        if (icon) icon.className = 'ph ph-sun';
    } else {
        html.removeAttribute('data-theme');
        if (icon) icon.className = 'ph ph-moon';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const currentTheme = html.getAttribute('data-theme');

            if (currentTheme === 'light') {
                // Switch to Dark
                html.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
                if (icon) icon.className = 'ph ph-moon';

                // Add animation class
                themeToggle.classList.add('rotate-icon');
                setTimeout(() => themeToggle.classList.remove('rotate-icon'), 300);
            } else {
                // Switch to Light
                html.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                if (icon) icon.className = 'ph ph-sun';

                // Add animation class
                themeToggle.classList.add('rotate-icon');
                setTimeout(() => themeToggle.classList.remove('rotate-icon'), 300);
            }
        });
    }
}
