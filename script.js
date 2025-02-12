// script.js

document.addEventListener("DOMContentLoaded", function() {
  // Animation d'apparition avec GSAP
  gsap.from("#mainTitle", { duration: 1, y: -50, opacity: 0 });
  gsap.from("#subTitle", { duration: 1, y: 50, opacity: 0, delay: 0.5 });
  gsap.from("#chartSection", { duration: 1, opacity: 0, delay: 1 });
  gsap.from("#fluidSection", { duration: 1, opacity: 0, delay: 1.5 });

  // Configuration du graphique avec Chart.js
  const ctx = document.getElementById("insectChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["1989", "1995", "2001", "2007", "2013", "2016"],
      datasets: [{
        label: "Biomasse relative (%)",
        data: [100, 90, 75, 60, 45, 24],
        backgroundColor: "rgba(99, 110, 250, 0.2)",
        borderColor: "rgba(99, 110, 250, 1)",
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: "top" },
        title: {
          display: true,
          text: "Évolution de la biomasse des insectes volants (1989 - 2016)"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 110,
          title: { display: true, text: "Biomasse relative (%)" }
        },
        x: {
          title: { display: true, text: "Années" }
        }
      }
    }
  });

  // Animation fluide inspirée de la mécanique des fluides
  const fluidCanvas = document.getElementById("fluidCanvas");
  const fluidCtx = fluidCanvas.getContext("2d");

  // Ajustement de la taille du canvas fluid en fonction de son conteneur
  function resizeFluidCanvas() {
    fluidCanvas.width = fluidCanvas.clientWidth;
    fluidCanvas.height = fluidCanvas.clientHeight;
  }
  resizeFluidCanvas();
  window.addEventListener("resize", resizeFluidCanvas);

  let time = 0;
  function drawWave() {
    fluidCtx.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);
    const amplitude = 30;      // Amplitude de la vague
    const wavelength = 100;    // Longueur d'onde
    const speed = 0.05;        // Vitesse de défilement

    fluidCtx.fillStyle = "rgba(99, 110, 250, 0.5)";
    fluidCtx.beginPath();
    fluidCtx.moveTo(0, fluidCanvas.height);
    // Dessiner une onde sinusoïdale
    for (let x = 0; x <= fluidCanvas.width; x++) {
      const y = amplitude * Math.sin((x / wavelength) + time) + (fluidCanvas.height / 2);
      fluidCtx.lineTo(x, y);
    }
    fluidCtx.lineTo(fluidCanvas.width, fluidCanvas.height);
    fluidCtx.closePath();
    fluidCtx.fill();

    time += speed;
    requestAnimationFrame(drawWave);
  }
  drawWave();
});
