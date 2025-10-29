// App Dondokas - Agendamentos
const services = [
  { name: "Manicure", price: 30 },
  { name: "Unha de Gel", price: 60 },
  { name: "Banho de Gel", price: 55 },
  { name: "Fibra de Vidro", price: 80 },
  { name: "Postiça Realista", price: 50 },
  { name: "Escova Simples", price: 40 },
  { name: "Mechas", price: 120 },
  { name: "Coloração", price: 90 },
];

const container = document.querySelector("main");

function renderServices() {
  container.innerHTML = "";
  services.forEach((service) => {
    const card = document.createElement("div");
    card.classList.add("service-card");
    card.innerHTML = `
      <h2>${service.name}</h2>
      <p>💰 R$ ${service.price},00</p>
      <button onclick="agendar('${service.name}')">Agendar</button>
    `;
    container.appendChild(card);
  });
}

function agendar(serviceName) {
  const nome = prompt(`Qual o seu nome para o agendamento de ${serviceName}?`);
  const data = prompt("Informe o dia e horário (ex: 05/11 às 15h):");
  if (nome && data) {
    alert(`Agendamento confirmado!\n\nCliente: ${nome}\nServiço: ${serviceName}\nHorário: ${data}\n💅`);
  } else {
    alert("Agendamento cancelado ou incompleto.");
  }
}

renderServices();
