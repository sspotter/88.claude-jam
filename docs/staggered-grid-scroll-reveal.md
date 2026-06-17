# Scroll-Pinned Staggered Grid Reveal Guide

This guide explains how to implement a scroll-pinned staggered grid reveal animation. This premium effect locks the screen (pins the section) while the user scrolls, revealing cards one by one from the bottom, and then unpins the section to scroll naturally once all cards are visible.

---

## 1. HTML Structure

Use a track container (which determines scroll duration) and a sticky viewport wrapper (which keeps content centered). Use data attributes to query elements in Javascript.

```html
<!-- 1. The Stage Track: Sets the height for the scroll duration (e.g. 220vh) -->
<section class="scroll-reveal-track" data-reveal-stage>
  
  <!-- 2. Sticky Panel: Locks in place for 100% of viewport height -->
  <div class="scroll-reveal-sticky" data-reveal-sticky>
    <div class="content-container">
      
      <!-- Fixed Header (stays on screen throughout the pin) -->
      <div class="reveal-header">
        <span>Our Selection</span>
        <h2>Shop by Category</h2>
      </div>
      
      <!-- Responsive Grid Container -->
      <div class="reveal-grid">
        
        <!-- Animated Cards -->
        <article class="reveal-card">
          <h3>Card Title 1</h3>
          <p>Description 1</p>
        </article>
        
        <article class="reveal-card">
          <h3>Card Title 2</h3>
          <p>Description 2</p>
        </article>
        
        <article class="reveal-card">
          <h3>Card Title 3</h3>
          <p>Description 3</p>
        </article>
        
        <article class="reveal-card">
          <h3>Card Title 4</h3>
          <p>Description 4</p>
        </article>

      </div>
    </div>
  </div>
</section>
```

---

## 2. CSS Styling

The CSS sets up the sticky pinning, wraps the layout, hides the cards initially, and transitions them smoothly to full visibility.

```css
/* Container Track */
.scroll-reveal-track {
  position: relative;
  height: 220vh; /* Tracks scroll height. Larger values = slower, longer pin duration. */
  background: #fcf8f0;
}

/* Sticky Viewport Panel */
.scroll-reveal-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  width: 100%;
}

/* Page Alignment Container */
.content-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
}

.reveal-header {
  text-align: center;
}

/* The Responsive Columns Grid */
.reveal-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* Default 4 columns */
  gap: 2.5rem;
  width: 100%;
}

@media (max-width: 900px) {
  .reveal-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on tablet */
    gap: 2rem;
  }
}

@media (max-width: 500px) {
  .reveal-grid {
    grid-template-columns: 1fr; /* 1 column on mobile */
    gap: 1.5rem;
  }
}

/* Card Animating Styles */
.reveal-card {
  position: relative;
  
  /* 1. Initial State: Hidden and shifted down */
  opacity: 0;
  transform: translateY(60px);
  
  /* 2. Transition Settings: Using a premium cubic-bezier ease */
  transition:
    opacity 650ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 650ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 350ms cubic-bezier(0.25, 1, 0.5, 1);
  
  will-change: transform, opacity;
}

/* 3. Revealed State */
.reveal-card.is-revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Optional hover state */
.reveal-card.is-revealed:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}
```

---

## 3. JavaScript Logic

Add the following Javascript code. It listens to the window scroll and resize events, calculates how far the user has scrolled *inside* the track section, and toggles the class `.is-revealed` on each card.

```javascript
document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector("[data-reveal-stage]");
  const cards = document.querySelectorAll(".reveal-card");

  let stageTop = 0;
  let scrollHeight = 0;
  let ticking = false;

  // 1. Calculate and update page layout metrics
  function updateDimensions() {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    // Global scroll position of the top of the track container
    stageTop = rect.top + window.scrollY;
    // Total scrollable height inside the track
    scrollHeight = stage.offsetHeight - window.innerHeight;
  }

  // 2. Animate elements based on scroll progress
  function animateCards() {
    if (!stage || cards.length === 0 || scrollHeight <= 0) return;

    // Local progress inside the track (0.0 at the top, 1.0 at the bottom)
    let progress = (window.scrollY - stageTop) / scrollHeight;
    progress = Math.max(0, Math.min(1, progress));

    // Stagger thresholds for each card
    cards.forEach((card, index) => {
      // Splits the 0.0-1.0 scroll range. 
      // Card 0 triggers at 0.05 progress, Card 1 at 0.30, Card 2 at 0.55, Card 3 at 0.80.
      const revealThreshold = 0.05 + index * (0.8 / (cards.length - 1 || 1));
      
      if (progress >= revealThreshold) {
        card.classList.add("is-revealed");
      } else {
        card.classList.remove("is-revealed");
      }
    });
  }

  // 3. Initialize metrics and render initial frame
  updateDimensions();
  animateCards();

  // 4. Performance-optimized scroll listener (using RequestAnimationFrame)
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        animateCards();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // 5. Re-calculate metrics on resize
  window.addEventListener("resize", () => {
    updateDimensions();
    animateCards();
  });
});
```

---

## 4. Customization Tips

* **Adjust Pin Duration**: Adjust the CSS height of `.scroll-reveal-track`. A value of `150vh` will scroll quickly, whereas `300vh` will stay locked/pinned on screen for longer.
* **Add/Remove Cards**: The JavaScript threshold formula dynamically adapts to any number of cards:
  `0.05 + index * (0.8 / (cards.length - 1))`
  You can put 3, 5, or 6 cards in your HTML and it will stagger them evenly between `5%` and `85%` scroll progress automatically.
* **Reveal direction**: You can change `transform: translateY(60px)` in CSS to `transform: translateX(-40px)` or `transform: scale(0.9)` if you prefer horizontal entry slides or zoom-in reveals instead of bottom rise.
