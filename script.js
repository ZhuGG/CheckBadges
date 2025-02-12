// script.js

document.addEventListener("DOMContentLoaded", function() {
  // --- Animations d'introduction avec GSAP ---
  gsap.from("nav", { duration: 1, opacity: 0, delay: 0.2 });
  gsap.from("header", { duration: 1, y: -50, opacity: 0 });
  gsap.from("main", { duration: 1, opacity: 0, delay: 0.5 });
  gsap.from("footer", { duration: 1, opacity: 0, delay: 1 });

  // --- Graphique 1 : Biomasse Relative ---
  const ctx1 = document.getElementById("biomasseChart").getContext("2d");
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
  new Chart(ctx1, {
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

  // --- Graphique 3 : Bar Chart sur la Diversité des Insectes ---
  const ctx3 = document.getElementById("diversiteChart").getContext("2d");
  const diversiteData = {
    labels: ["Abeilles", "Papillons", "Coléoptères", "Libellules", "Diptères"],
    datasets: [{
      label: "Déclin (%)",
      data: [80, 70, 50, 60, 30],
      backgroundColor: [
        "rgba(255, 159, 64, 0.6)",
        "rgba(255, 205, 86, 0.6)",
        "rgba(75, 192, 192, 0.6)",
        "rgba(153, 102, 255, 0.6)",
        "rgba(201, 203, 207, 0.6)"
      ],
      borderColor: [
        "rgba(255, 159, 64, 1)",
        "rgba(255, 205, 86, 1)",
        "rgba(75, 192, 192, 1)",
        "rgba(153, 102, 255, 1)",
        "rgba(201, 203, 207, 1)"
      ],
      borderWidth: 1
    }]
  };
  new Chart(ctx3, {
    type: "bar",
    data: diversiteData,
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#E0E0E0" }, display: false },
        title: {
          display: true,
          text: "Déclin par Groupe d'Insectes",
          color: "#E0E0E0",
          font: { size: 18 }
        }
      },
      scales: {
        x: {
          ticks: { color: "#E0E0E0" },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: "#E0E0E0" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      }
    }
  });

  // --- Animation Fluide : Gauge représentant le niveau de biomasse ---
  // On utilisera la donnée du graphique 1 pour le gauge : ici 30% pour 2020
  const gaugeCanvas = document.getElementById("gaugeCanvas");
  const gaugeCtx = gaugeCanvas.getContext("2d");
  
  // Ajustement du canvas en fonction de son conteneur
  function resizeGauge() {
    gaugeCanvas.width = gaugeCanvas.clientWidth;
    gaugeCanvas.height = gaugeCanvas.clientHeight;
  }
  resizeGauge();
  window.addEventListener("resize", resizeGauge);
  
  let gaugeTime = 0;
  const targetValue = biomasseData.datasets[0].data[biomasseData.datasets[0].data.length - 1]; // 30%
  function drawGauge() {
    const width = gaugeCanvas.width;
    const height = gaugeCanvas.height;
    gaugeCtx.clearRect(0, 0, width, height);

    // Calcul du niveau de remplissage : 0% => remplissage complet du bas, 100% => vide
    const fillLevel = height * (1 - (targetValue / 100));

    // Dessiner le réservoir
    gaugeCtx.strokeStyle = "#00F0FF";
    gaugeCtx.lineWidth = 4;
    gaugeCtx.strokeRect(0, 0, width, height);

    // Dessiner le niveau de liquide avec une onde fluide
    let time = gaugeTime;
    gaugeCtx.beginPath();
    gaugeCtx.moveTo(0, height);
    for (let x = 0; x <= width; x++) {
      // On combine une onde sinusoïdale avec le niveau de remplissage
      const y = 10 * Math.sin((x / 20) + time) + fillLevel;
      gaugeCtx.lineTo(x, y);
    }
    gaugeCtx.lineTo(width, height);
    gaugeCtx.closePath();
    
    // Création d'un dégradé pour le liquide
    const grad = gaugeCtx.createLinearGradient(0, fillLevel, 0, height);
    grad.addColorStop(0, "#FF00FF");
    grad.addColorStop(1, "#00F0FF");
    gaugeCtx.fillStyle = grad;
    gaugeCtx.fill();
    
    // Affichage du pourcentage sur le gauge
    gaugeCtx.fillStyle = "#FFFFFF";
    gaugeCtx.font = "bold 24px Montserrat";
    gaugeCtx.textAlign = "center";
    gaugeCtx.fillText(`${targetValue}% de biomasse restante`, width / 2, height / 2);
    
    gaugeTime += 0.05;
    requestAnimationFrame(drawGauge);
  }
  drawGauge();
});
