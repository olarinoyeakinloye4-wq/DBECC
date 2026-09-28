document.addEventListener('DOMContentLoaded', () => {
	// Config
	const WA_NUMBER_INTL = '2348032059981'; // international format for wa.me
	const WA_BASE = `https://wa.me/${WA_NUMBER_INTL}?text=`;

	// Helpers
	const qs = (s, ctx = document) => ctx.querySelector(s);
	const qsa = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
	const safeOpen = (url) => window.open(url, '_blank');

	/* ======================
		 MOBILE NAVIGATION
		 ====================== */
	const mobileToggle = qs('.mobile-menu-toggle');
	const primaryNav = qs('#primary-navigation');
	const siteHeader = qs('header');

	function closeMobileNav() {
		if (!primaryNav) return;
		primaryNav.classList.remove('open');
		if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
		primaryNav.setAttribute('aria-hidden', 'true');
	}
	function openMobileNav() {
		if (!primaryNav) return;
		primaryNav.classList.add('open');
		if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'true');
		primaryNav.setAttribute('aria-hidden', 'false');
	}

	if (mobileToggle && primaryNav) {
		mobileToggle.addEventListener('click', (e) => {
			const isOpen = primaryNav.classList.toggle('open');
			mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			primaryNav.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
		});

		// Close when clicking outside
		document.addEventListener('click', (e) => {
			const isClickInsideNav = primaryNav.contains(e.target) || mobileToggle.contains(e.target);
			if (!isClickInsideNav && primaryNav.classList.contains('open')) {
				closeMobileNav();
			}
		});

		// Close when a nav link is clicked (mobile)
		qsa('#primary-navigation a').forEach((a) => {
			a.addEventListener('click', () => {
				// allow default navigation/behavior but close menu
				if (window.innerWidth <= 900) closeMobileNav();
			});
		});
	}

	/* ======================
		 SMOOTH SCROLLING
		 ====================== */
	function smoothScrollTo(hash) {
		try {
			const el = document.querySelector(hash);
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		} catch (err) {
			/* noop */
		}
	}

	// Intercept internal anchor clicks for smooth scroll or special handling
	qsa('a[href^="#"]').forEach((anchor) => {
		anchor.addEventListener('click', (e) => {
			const href = anchor.getAttribute('href');
			const text = (anchor.textContent || '').trim().toLowerCase();

			// If anchor explicitly links to WhatsApp (some CTAs already do), allow default
			const hrefVal = anchor.getAttribute('href') || '';
			if (hrefVal.startsWith('https://wa.me') || hrefVal.startsWith('mailto:') || hrefVal.startsWith('tel:')) {
				return;
			}

			// If button text includes 'order', open WhatsApp to place order
			if (text.includes('order')) {
				e.preventDefault();
				const message = encodeURIComponent('Hello D Bomibam Exquisite Confectionaries & Co., I would like to make an order.');
				safeOpen(`${WA_BASE}${message}`);
				return;
			}

			// Otherwise prevent default and smooth-scroll to target
			e.preventDefault();
			if (href && href.startsWith('#')) smoothScrollTo(href);
		});
	});

	/* ======================
		 NAVBAR SCROLL EFFECT
		 ====================== */
	const SCROLL_CLASS = 'nav-scrolled';
	function updateHeaderOnScroll() {
		if (!siteHeader) return;
		if (window.scrollY > 18) siteHeader.classList.add(SCROLL_CLASS);
		else siteHeader.classList.remove(SCROLL_CLASS);
	}
	updateHeaderOnScroll();
	window.addEventListener('scroll', throttle(updateHeaderOnScroll, 100));

	/* ======================
		 SCROLL REVEAL (IntersectionObserver)
		 ====================== */
	const revealSelector = [
		'#about',
		'.product-card',
		'.signature-item',
		'.gallery-item',
		'#events',
		'.feature-item',
		'#contact'
	].join(',');

	const revealElements = qsa(revealSelector);
	const ioOptions = { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 };

	const revealObserver = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			const el = entry.target;
			if (entry.isIntersecting) {
				el.style.opacity = '1';
				el.style.transform = 'none';
				el.style.transition = el.style.transition || 'opacity .6s ease, transform .6s var(--transition)';
				revealObserver.unobserve(el);
			}
		});
	}, ioOptions);

	// Initialize hidden state and observe
	revealElements.forEach((el) => {
		// skip if already visible or in a small section
		if (!el) return;
		el.style.opacity = '0';
		el.style.transform = 'translateY(14px)';
		el.style.transition = 'opacity .6s ease, transform .6s var(--transition)';
		revealObserver.observe(el);
	});

	/* ======================
		 GALLERY LIGHTBOX
		 ====================== */
	// Create lightbox elements
	const createLightbox = () => {
		const overlay = document.createElement('div');
		overlay.className = 'lightbox-overlay';
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.style.cssText = `
			position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;
		`;
		const wrapper = document.createElement('div');
		wrapper.className = 'lightbox-wrapper';
		wrapper.style.cssText = `
			max-width:1100px;width:100%;max-height:90vh;display:flex;align-items:center;justify-content:center;position:relative;
		`;
		const img = document.createElement('img');
		img.className = 'lightbox-image';
		img.style.cssText = 'max-width:100%;max-height:90vh;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,0.6);display:block';
		const closeBtn = document.createElement('button');
		closeBtn.className = 'lightbox-close';
		closeBtn.innerHTML = '&times;';
		closeBtn.setAttribute('aria-label', 'Close image');
		closeBtn.style.cssText = `
			position:absolute;top:-14px;right:-14px;background:var(--card-bg);border-radius:50%;border:1px solid rgba(0,0,0,0.08);width:44px;height:44px;font-size:28px;cursor:pointer;
		`;
		wrapper.appendChild(img);
		wrapper.appendChild(closeBtn);
		overlay.appendChild(wrapper);
		document.body.appendChild(overlay);
		return { overlay, wrapper, img, closeBtn };
	};

	let lightboxElems = null;
	let lastFocused = null;

	function openLightbox(src, alt = '') {
		if (!src) return;
		if (!lightboxElems) lightboxElems = createLightbox();
		const { overlay, img, closeBtn } = lightboxElems;
		img.src = src;
		img.alt = alt || 'Image';
		overlay.style.display = 'flex';
		lastFocused = document.activeElement;
		closeBtn.focus();

		// Close handlers
		function onClose() {
			overlay.style.display = 'none';
			img.src = '';
			document.removeEventListener('keydown', onKey);
			overlay.removeEventListener('click', onOverlayClick);
			closeBtn.removeEventListener('click', onClose);
			if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
		}
		function onKey(e) {
			if (e.key === 'Escape') onClose();
		}
		function onOverlayClick(e) {
			if (e.target === overlay) onClose();
		}

		document.addEventListener('keydown', onKey);
		overlay.addEventListener('click', onOverlayClick);
		closeBtn.addEventListener('click', onClose);
	}

	// Attach gallery click handlers
	qsa('.gallery-item img, .signature-item img').forEach((img) => {
		img.style.cursor = 'zoom-in';
		img.addEventListener('click', (e) => {
			const src = img.getAttribute('src');
			const alt = img.getAttribute('alt') || '';
			openLightbox(src, alt);
		});
		// Handle keyboard accessibility
		img.setAttribute('tabindex', '0');
		img.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				img.click();
			}
		});
	});

	/* ======================
		 PRODUCT / MENU INTERACTION (WhatsApp)
		 ====================== */
	qsa('.product-card').forEach((card) => {
		const titleEl = qs('h3', card);
		const btn = qs('.btn', card);
		const productName = (titleEl && titleEl.textContent.trim()) || 'Product';
		if (btn) {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const msg = encodeURIComponent(`Hello D Bomibam Exquisite Confectionaries & Co., I would like to order: ${productName}`);
				safeOpen(`${WA_BASE}${msg}`);
			});
		}
	});

	// Generic CTA buttons that include 'order' in text open WhatsApp
	qsa('a,button').forEach((el) => {
		const text = (el.textContent || '').toLowerCase();
		if (text.includes('order') && !el.closest('.product-card')) {
			el.addEventListener('click', (e) => {
				// If it's an anchor that navigates to wa.me already, let it go
				const href = el.getAttribute && el.getAttribute('href');
				if (href && href.startsWith('https://wa.me')) return;
				e.preventDefault();
				const msg = encodeURIComponent('Hello D Bomibam Exquisite Confectionaries & Co., I would like to make an order.');
				safeOpen(`${WA_BASE}${msg}`);
			});
		}
	});

	/* ======================
		 CONTACT FORM EMAIL HANDLER
		 ====================== */
	const contactForm = qs('.contact-form');
	if (contactForm) {
		contactForm.addEventListener('submit', (e) => {
			e.preventDefault();
			const name = qs('#name', contactForm)?.value.trim() || 'Customer';
			const email = qs('#email', contactForm)?.value.trim() || 'Not provided';
			const message = qs('#message', contactForm)?.value.trim() || 'No message provided.';
			const subject = encodeURIComponent('Order Inquiry from Website');
			const body = encodeURIComponent(
				`Hello D Bomibam Exquisite Confectionaries & Co.%0D%0A%0D%0AName: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0AMessage:%0D%0A${message}%0D%0A%0D%0AThank you.`
			);
			window.location.href = `mailto:jumskky1@gmail.com?subject=${subject}&body=${body}`;
		});
	}

	/* ======================
		 CONTACT LINKS (ensure behavior)
		 ====================== */
	// Already set via HTML: tel: and mailto: and wa.me. Nothing to change.

	/* ======================
		 ACTIVE NAVIGATION (which section is in view)
		 ====================== */
	const sections = qsa('main > section[id]');
	const navLinks = qsa('#primary-navigation a');
	const sectionObserver = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			const id = entry.target.getAttribute('id');
			const corresponding = navLinks.find((a) => a.getAttribute('href') === `#${id}`);
			if (entry.isIntersecting) {
				// Remove active class on all and add to matching link
				navLinks.forEach((a) => a.classList.remove('active'));
				if (corresponding) corresponding.classList.add('active');
			}
		});
	}, { root: null, threshold: 0.45 });

	sections.forEach((s) => sectionObserver.observe(s));

	/* ======================
		 BACK TO TOP BUTTON
		 ====================== */
	const backToTop = document.createElement('button');
	backToTop.id = 'back-to-top';
	backToTop.title = 'Back to top';
	backToTop.innerHTML = '&#8679;';
	Object.assign(backToTop.style, {
		position: 'fixed',
		right: '18px',
		bottom: '22px',
		width: '46px',
		height: '46px',
		borderRadius: '50%',
		border: 'none',
		background: 'var(--color-primary)',
		color: 'white',
		fontSize: '22px',
		display: 'none',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 999,
		cursor: 'pointer',
		boxShadow: '0 12px 30px rgba(0,0,0,0.18)'
	});
	backToTop.setAttribute('aria-label', 'Back to top');
	document.body.appendChild(backToTop);

	backToTop.addEventListener('click', () => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	});

	function toggleBackToTop() {
		if (window.scrollY > 360) backToTop.style.display = 'flex';
		else backToTop.style.display = 'none';
	}
	toggleBackToTop();
	window.addEventListener('scroll', throttle(toggleBackToTop, 150));

	/* ======================
		 IMAGE HANDLING (error fallback)
		 ====================== */
	qsa('img').forEach((img) => {
		img.addEventListener('error', () => {
			img.style.opacity = '0';
			img.style.transition = 'opacity .3s ease';
			// Add a subtle fallback box so layout doesn't collapse
			const placeholder = document.createElement('div');
			placeholder.className = 'img-placeholder';
			placeholder.textContent = img.getAttribute('alt') || 'Image unavailable';
			placeholder.style.cssText = `
				width:${img.width || '100%'};height:${img.height || '180px'};display:flex;align-items:center;justify-content:center;
				background:linear-gradient(180deg, var(--bg-main), var(--card-bg));color:var(--color-primary);
				border-radius:8px;border:1px solid rgba(0,0,0,0.03);padding:12px;font-size:0.95rem;
			`;
			img.insertAdjacentElement('afterend', placeholder);
		}, { once: true });
	});

	/* ======================
		 ACCESSIBILITY / KEYBOARD
		 ====================== */
	// Ensure mobile menu toggle is keyboard accessible (button already is)
	if (mobileToggle) {
		mobileToggle.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				mobileToggle.click();
			}
		});
	}

	/* ======================
		 PERFORMANCE HELPERS
		 ====================== */
	function throttle(fn, wait = 100) {
		let last = 0;
		let timeout = null;
		return function (...args) {
			const now = Date.now();
			const remaining = wait - (now - last);
			if (remaining <= 0) {
				if (timeout) { clearTimeout(timeout); timeout = null; }
				last = now;
				fn.apply(this, args);
			} else if (!timeout) {
				timeout = setTimeout(() => {
					last = Date.now();
					timeout = null;
					fn.apply(this, args);
				}, remaining);
			}
		};
	}

	/* ======================
		 IMAGE PRELOAD SAFETY
		 ====================== */
	// Ensure hero image fills container without distortion (CSS handles object-fit:cover),
	// here we verify that hero image is loaded and remove any temporary low-res placeholder
	const heroImg = qs('.hero-image img');
	if (heroImg) {
		heroImg.addEventListener('load', () => {
			heroImg.style.visibility = 'visible';
		});
		heroImg.addEventListener('error', () => {
			// do nothing, fallback will be applied by global image error handler
		});
	}

	/* ======================
		 Ensure no console errors for missing elements
		 ====================== */
	// Defensive noop already used throughout.

	// End DOMContentLoaded
});

