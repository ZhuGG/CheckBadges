document.addEventListener('DOMContentLoaded', () => {
  // Animation d'apparition avec GSAP
  gsap.from("#mainTitle", { duration: 1, y: -50, opacity: 0 });
  gsap.from("#subTitle", { duration: 1, y: 50, opacity: 0, delay: 0.5 });
  gsap.from("#chartSection", { duration: 1, opacity: 0, delay: 1 });

  // Préparation du contexte du canvas pour Chart.js
  const ctx = document.getElementById('insectChart').getContext('2d');

  // Jeu de données approximatif basé sur l'étude de Hallmann et al. (2017)
  const insectData = {
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
  };

  // Configuration du graphique
  const config = {
    type: 'line',
    data: insectData,
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' },
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
  };

  // Création du graphique
  new Chart(ctx, config);
});
