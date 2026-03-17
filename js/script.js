// BALATRO EFFECT: APPLY TO ENTIRE PODIUM CONTAINER
document.querySelectorAll('.podium').forEach(card => {
    let animFrame;
    card.addEventListener('mousemove', e => {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const maxTilt = 10;
        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;
        card.style.transform = `translateY(${card.dataset.offsetY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });
    });
    card.addEventListener('mouseleave', () => {
    card.style.transition = 'transform 0.3s ease';
    card.style.transform = `translateY(${card.dataset.offsetY}px) rotateX(0deg) rotateY(0deg) scale(1)`;
    setTimeout(() => card.style.transition = '', 300);
    });
    card.dataset.offsetY = parseFloat(window.getComputedStyle(card).transform.split(',')[5]) || 0;
});