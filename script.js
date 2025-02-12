// script.js

document.addEventListener("DOMContentLoaded", function() {
  // Animations d'introduction avec GSAP
  gsap.from("header", { duration: 1, y: -50, opacity: 0 });
  gsap.from("main", { duration: 1, opacity: 0, delay: 0.5 });
  gsap.from("footer", { duration: 1, opacity: 0, delay: 1 });

  // --- Graphique avec Chart.js ---
  const ctx = document.getElementById("insectChart").getContext("2d");
  // Données enrichies : évolution sur plusieurs décennies (exemple hypothétique)
  const chartData = {
    labels: ["1990", "2000", "2010", "2020"],
    datasets: [{
      label: "Biomasse relative (%)",
      data: [100, 80, 50, 20],
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderColor: "rgba(255, 99, 132, 1)",
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }]
  };
  const chartConfig = {
    type: "line",
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#E0E0E0" },
          position: "top"
        },
        title: {
          display: true,
          text: "Évolution du Déclin des Insectes en Europe",
          color: "#E0E0E0",
          font: { size: 18 }
        }
      },
      scales: {
        x: {
          ticks: { color: "#E0E0E0" },
          grid: { color: "rgba(255, 255, 255, 0.1)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#E0E0E0" },
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          max: 110
        }
      }
    }
  };
  new Chart(ctx, chartConfig);

  // --- Animation fluide inspirée de la mécanique des fluides ---
  const fluidCanvas = document.getElementById("fluidCanvas");
  const fluidCtx = fluidCanvas.getContext("2d");

  // Ajustement de la taille du canvas en fonction du conteneur
  function resizeFluidCanvas() {
    fluidCanvas.width = fluidCanvas.clientWidth;
    fluidCanvas.height = fluidCanvas.clientHeight;
  }
  resizeFluidCanvas();
  window.addEventListener("resize", resizeFluidCanvas);

  let time = 0;
  function drawFluid() {
    const width = fluidCanvas.width;
    const height = fluidCanvas.height;
    fluidCtx.clearRect(0, 0, width, height);

    // Paramètres de l'onde fluide
    const amplitude = 40;    // Amplitude de la vague
    const frequency = 0.02;  // Fréquence
    const speed = 0.03;      // Vitesse de défilement
    const offset = height / 2;

    fluidCtx.beginPath();
    fluidCtx.moveTo(0, height);
    for (let x = 0; x <= width; x++) {
      // Calcul de l'onde avec un mélange de sinusoïdes pour un effet plus organique
      const y = amplitude * Math.sin(frequency * x + time) +
                (5 * Math.sin(3 * frequency * x + time * 2)) +
                offset;
      fluidCtx.lineTo(x, y);
    }
    fluidCtx.lineTo(width, height);
    fluidCtx.closePath();

    // Dégradé linéaire pour un effet néon
    const gradient = fluidCtx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#00F0FF");
    gradient.addColorStop(0.5, "#FF00FF");
    gradient.addColorStop(1, "#00F0FF");

    fluidCtx.fillStyle = gradient;
    fluidCtx.fill();

    time += speed;
    requestAnimationFrame(drawFluid);
  }
  drawFluid();
});
