const revealItems = document.querySelectorAll('.reveal');
const navLinks = document.querySelectorAll('.bottom-nav a');
const sectionMap = new Map();
const topHeader = document.getElementById('top-header');
const ambientOrbs = document.querySelectorAll('.orb[data-speed]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function syncHeaderState() {
	if (!topHeader) {
		return;
	}

	topHeader.classList.toggle('scrolled', window.scrollY > 28);
}

function updateAmbientParallax() {
	if (prefersReducedMotion || ambientOrbs.length === 0) {
		return;
	}

	const viewportHeight = Math.max(window.innerHeight, 1);
	const normalizedY = window.scrollY / viewportHeight;

	for (const orb of ambientOrbs) {
		const speed = Number(orb.dataset.speed || 0);
		const offset = Math.round(normalizedY * speed * 90);
		orb.style.transform = `translate3d(0, ${offset}px, 0)`;
	}
}

syncHeaderState();
updateAmbientParallax();
window.addEventListener('scroll', () => {
	syncHeaderState();
	updateAmbientParallax();
});

for (const link of navLinks) {
	const targetId = link.getAttribute('href');
	const section = document.querySelector(targetId);
	if (section) {
		sectionMap.set(section, link);
	}
}

function scrollToSection(section) {
	if (!section) {
		return;
	}

	const headerOffset = topHeader ? topHeader.offsetHeight + 10 : 70;
	const targetY = section.getBoundingClientRect().top + window.scrollY - headerOffset;
	window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
}

for (const link of navLinks) {
	link.addEventListener('click', (event) => {
		const targetId = link.getAttribute('href');
		if (!targetId || !targetId.startsWith('#')) {
			return;
		}

		const section = document.querySelector(targetId);
		if (!section) {
			return;
		}

		event.preventDefault();
		scrollToSection(section);

		if (window.location.hash !== targetId) {
			history.replaceState(null, '', targetId);
		}
	});
}

if ('IntersectionObserver' in window) {
	const revealObserver = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
				}
			}
		},
		{ threshold: 0.2 }
	);

	for (const item of revealItems) {
		revealObserver.observe(item);
	}

	const sectionObserver = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) {
					continue;
				}

				const activeLink = sectionMap.get(entry.target);
				if (!activeLink) {
					continue;
				}

				for (const link of navLinks) {
					link.classList.remove('active');
				}
				activeLink.classList.add('active');
			}
		},
		{
			threshold: 0.55
		}
	);

	for (const section of sectionMap.keys()) {
		sectionObserver.observe(section);
	}
} else {
	for (const item of revealItems) {
		item.classList.add('visible');
	}
}

const playButtons = document.querySelectorAll('.play-btn');
const nowPlayingArtwork = document.getElementById('now-playing-artwork');
const artworkCache = new Map();
let artworkRequestId = 0;

const fallbackArtwork = 'soundcloud-cover.svg';

async function getTrackArtwork(trackUrl) {
	if (!trackUrl) {
		return fallbackArtwork;
	}

	// Keep a fixed visual identity card in the now-playing artwork area.
	return fallbackArtwork;

	/*
	if (artworkCache.has(trackUrl)) {
		return artworkCache.get(trackUrl);
	}

	try {
		const oEmbedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(trackUrl)}`;
		const response = await fetch(oEmbedUrl);
		if (!response.ok) {
			throw new Error('No artwork response');
		}

		const data = await response.json();
		const thumbnail = data.thumbnail_url || '';
		const highRes = thumbnail ? thumbnail.replace('-large', '-t500x500') : '';
		const artworkUrl = highRes || thumbnail || fallbackArtwork;
		artworkCache.set(trackUrl, artworkUrl);
		return artworkUrl;
	} catch {
		artworkCache.set(trackUrl, fallbackArtwork);
		return fallbackArtwork;
	}
	*/
}

async function updateNowPlayingArtwork(trackUrl, trackTitle) {
	if (!nowPlayingArtwork) {
		return;
	}

	const requestId = ++artworkRequestId;
	nowPlayingArtwork.src = fallbackArtwork;
	nowPlayingArtwork.alt = `Portada de ${trackTitle || 'la cancion seleccionada'}`;

	const artworkUrl = await getTrackArtwork(trackUrl);
	if (requestId !== artworkRequestId) {
		return;
	}

	nowPlayingArtwork.src = artworkUrl;
}

for (const button of playButtons) {
	button.addEventListener('click', async () => {
		const trackUrl = button.dataset.url;
		const trackTitle = button.dataset.title;
		if (!trackUrl) {
			return;
		}

		await updateNowPlayingArtwork(trackUrl, trackTitle);
		window.open(trackUrl, '_blank', 'noopener,noreferrer');

		for (const btn of playButtons) {
			btn.classList.remove('is-playing');
		}
		button.classList.add('is-playing');
	});
}

if (playButtons.length > 0) {
	const firstButton = playButtons[0];
	const initialUrl = firstButton.dataset.url;
	const initialTitle = firstButton.dataset.title;
	if (initialUrl && initialTitle) {
		updateNowPlayingArtwork(initialUrl, initialTitle);
	}
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js').catch(() => {});
}
