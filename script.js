// script.js

document.addEventListener("DOMContentLoaded", function() {
  // Animations d'introduction avec GSAP
  gsap.from("header", { duration: 1, y: -50, opacity: 0 });
  gsap.from("main", { duration: 1, opacity: 0, delay: 0.5 });
  gsap.from("footer", { duration: 1, opacity: 0, delay: 1 });
  gsap.from("nav", { duration: 1, opacity: 0, delay: 0.2 });

  // --- Graphique 1 : Biomasse relative ---
  const ctx1 = document.getElementById("insectChart").getContext("2d");
  const biomasseData = {
    labels: ["1990", "2000", "2010", "2020"],
    datasets: [{
      label: "Biomasse relative (%)",
      data: [100, 85, 60, 30],
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderColor: "rgba(255, 99, 132, 1)",
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }]
  };
  const chart1 = new Chart(ctx1, {
    type: "line",
    data: biomasseData,
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#E0E0E0" }, position: "top" },
        title: {
          display: true,
          text: "Évolution de la Biomasse Relative",
          color: "#E0E0E0",
          font: { size: 18 }
        }
      },
      scales: {
        x: {
          ticks: { color: "#E0E0E0" },
          grid: { color: "rgba(255,255,255,0.1)" }
        },
        y: {
          beginAtZero: true,
          max: 110,
          ticks: { color: "#E0E0E0" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      }
    }
  });

  // --- Graphique 2 : Pollinisateurs ---
  const ctx2 = document.getElementById("pollinatorChart").getContext("2d");
  const pollinatorData = {
    labels: ["1990", "2000", "2010", "2020"],
    datasets: [{
      label: "Insectes pollinisateurs (%)",
      data: [100, 75, 45, 15],
      backgroundColor: "rgba(0, 200, 255, 0.2)",
      borderColor: "rgba(0, 200, 255, 1)",
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }]
  };
  new Chart(ctx2, {
    type: "line",
    data: pollinatorData,
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#E0E0E0" }, position: "top" },
        title: {
          display: true,
          text: "Diminution des Insectes Pollinisateurs",
          color: "#E0E0E0",
          font: { size: 18 }
        }
      },
      scales: {
        x: {
          ticks: { color: "#E0E0E0" },
          grid: { color: "rgba(255,255,255,0.1)" }
        },
        y: {
          beginAtZero: true,
          max: 110,
          ticks: { color: "#E0E0E0" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      }
    }
  });

  // --- Animation fluide inspirée par la mécanique des fluides ---
  // Nous allons simuler un niveau de "remplissage" basé sur la donnée de biomasse en 2020.
  // Par exemple, pour le graphique 1, la valeur de 2020 est 30% (donc 30% du canvas sera rempli)
  const latestBiomasse = biomasseData.datasets[0].data[biomasseData.datasets[0].data.length - 1]; // 30%
  
  const fluidCanvas = document.getElementById("fluidCanvas");
  const fluidCtx = fluidCanvas.getContext("2d");

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

    // Calcul du niveau de remplissage en fonction de la donnée (ex. 30% de biomasse restante)
    const baseline = height * (1 - (latestBiomasse / 100)); // plus haut = moins de biomasse

    // Paramètres de l'onde
    const amplitude = 15;      // Amplitude de l'onde
    const frequency = 0.02;    // Fréquence
    const speed = 0.05;        // Vitesse de défilement

    fluidCtx.beginPath();
    fluidCtx.moveTo(0, height);
    for (let x = 0; x <= width; x++) {
      // Onde sinusoïdale ajoutée au baseline
      const y = amplitude * Math.sin(frequency * x + time) + baseline;
      fluidCtx.lineTo(x, y);
    }
    fluidCtx.lineTo(width, height);
    fluidCtx.closePath();

    // Création d'un dégradé néon
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
