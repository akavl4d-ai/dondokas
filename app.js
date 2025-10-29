import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdQs-5oVTR6C2NGEJdPgzCHpywdzGdAGI",
  authDomain: "dondokas.firebaseapp.com",
  projectId: "dondokas",
  storageBucket: "dondokas.firebasestorage.app",
  messagingSenderId: "942792883888",
  appId: "1:942792883888:web:47d118999f3b84fb534575"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

const loginSection = document.getElementById("login-section");
const agendaSection = document.getElementById("agenda-section");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginError = document.getElementById("login-error");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = "E-mail ou senha incorretos!";
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {
  if (user) {
    loginSection.classList.add("hidden");
    agendaSection.classList.remove("hidden");
    carregarAgendamentos();
  } else {
    loginSection.classList.remove("hidden");
    agendaSection.classList.add("hidden");
  }
});

document.getElementById("appointment-form").addEventListener("submit", async e => {
  e.preventDefault();
  const nomeCliente = document.getElementById("nomeCliente").value;
  const servico = document.getElementById("servico").value;
  const dataHorario = document.getElementById("dataHorario").value;

  await addDoc(collection(db, "agendamentos"), {
    nomeCliente,
    servico,
    dataHorario
  });

  document.getElementById("appointment-form").reset();
});

function carregarAgendamentos() {
  const lista = document.getElementById("listaAgendamentos");
  const q = query(collection(db, "agendamentos"), orderBy("dataHorario"));
  onSnapshot(q, snapshot => {
    lista.innerHTML = "";
    snapshot.forEach(doc => {
      const ag = doc.data();
      const li = document.createElement("li");
      li.textContent = `${ag.nomeCliente} - ${ag.servico} (${ag.dataHorario})`;
      lista.appendChild(li);
    });
  });
}
