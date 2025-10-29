// app.js (module) — usa Firebase CDN v9+/modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// ====== CONFIG ====== (mantive suas chaves)
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
const auth = getAuth(app);

// ====== PROFESSIONALS (edite aqui se quiser outros nomes) ======
const PROFESSIONALS = ["Nicole","Anne","Lane"];

// small helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const money = c => `R$ ${(c/100).toFixed(2).replace('.',',')}`;

// detect page
const page = location.pathname.split('/').pop().toLowerCase() || 'index.html';
if (page === '' || page === 'index.html') {
  clientPage();
} else if (page === 'login.html') {
  loginPage();
} else if (page === 'painel.html') {
  adminPage();
}

// ---------------- CLIENT ----------------
function clientPage(){
  // populate professionals select
  document.addEventListener('DOMContentLoaded', ()=>{
    const profSelect = $('#professional');
    if (profSelect) {
      PROFESSIONALS.forEach(p=>{
        const opt = document.createElement('option'); opt.value = p; opt.textContent = p; profSelect.appendChild(opt);
      });
    }

    const form = $('#booking-form');
    if (!form) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = $('#name').value.trim();
      const phone = $('#phone').value.trim();
      const service = $('#service').value;
      const professional = $('#professional').value;
      const datetime = $('#datetime').value;
      if (!name || !service || !datetime || !professional) {
        alert('Preencha nome, serviço, profissional e data/hora.');
        return;
      }
      try {
        await addDoc(collection(db,'agendamentos'), {
          customerName: name,
          phone: phone,
          service,
          professional,
          datetime: new Date(datetime).toISOString(),
          status: 'pending',
          createdAt: serverTimestamp()
        });
        form.reset();
        $('#result').innerHTML = '<strong>Agendamento recebido!</strong> Em breve confirmaremos.';
      } catch(err){
        console.error(err); alert('Erro ao enviar. Tente novamente.');
      }
    });
  });
}

// ---------------- LOGIN PAGE ----------------
function loginPage(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const form = $('#login-form');
    const error = $('#login-error');
    if (!form) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = $('#email').value.trim();
      const password = $('#password').value.trim();
      try {
        await signInWithEmailAndPassword(auth, email, password);
        location.href = 'painel.html';
      } catch(err){
        console.error(err); error.textContent = 'Erro no login. Verifique e tente novamente.';
      }
    });
  });
}

// ---------------- ADMIN / PAINEL ----------------
function adminPage(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const logoutBtn = $('#logout-btn');
    const goToIndex = $('#go-to-index');
    const bookingsList = $('#bookings-list');
    const searchInput = $('#search');
    const statusFilter = $('#status-filter');
    const clearFilter = $('#clear-filter');

    if (goToIndex) goToIndex.addEventListener('click', ()=> location.href = 'index.html');
    if (logoutBtn) logoutBtn.addEventListener('click', ()=> signOut(auth));

    // auth guard
    onAuthStateChanged(auth, user=>{
      if (!user) {
        location.href = 'login.html';
      } else {
        // subscribe to all bookings
        const q = query(collection(db,'agendamentos'), orderBy('createdAt','desc'));
        onSnapshot(q, snap=>{
          const arr = [];
          snap.forEach(d=> arr.push({ id: d.id, ...d.data() }));
          renderBookings(arr);
        });
      }
    });

    // filter interactions
    if (searchInput) {
      searchInput.addEventListener('input', ()=> applyFilters());
      statusFilter.addEventListener('change', ()=> applyFilters());
      clearFilter.addEventListener('click', ()=> { searchInput.value=''; statusFilter.value=''; applyFilters(); });
    }

    // store latest fetched bookings for filtering
    let LAST_BOOKINGS = [];
    function renderBookings(list){
      LAST_BOOKINGS = list.slice();
      applyFilters();
    }

    function applyFilters(){
      let list = LAST_BOOKINGS.slice();
      const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
      const st = (statusFilter && statusFilter.value) || '';
      if (q) {
        list = list.filter(b=>{
          return (b.customerName || '').toLowerCase().includes(q)
            || (b.service || '').toLowerCase().includes(q)
            || (b.professional || '').toLowerCase().includes(q);
        });
      }
      if (st) list = list.filter(b=> (b.status||'') === st );
      // render
      bookingsList.innerHTML = '';
      if (list.length === 0) bookingsList.innerHTML = '<div class="small-muted">Nenhum agendamento encontrado.</div>';
      list.forEach(b=>{
        const el = document.createElement('div');
        el.className = 'admin-row';
        el.innerHTML = `
          <div class="admin-left">
            <div style="font-weight:600">${escapeHtml(b.customerName)} — <span style="color:#b8860b">${escapeHtml(b.service)}</span></div>
            <div class="small-muted">${new Date(b.datetime).toLocaleString()} • Profissional: ${escapeHtml(b.professional)} • Tel: ${escapeHtml(b.phone||'')}</div>
          </div>
          <div class="admin-actions">
            <select data-id="${b.id}" class="status-select edit-input">
              <option value="pending" ${b.status==='pending'?'selected':''}>pending</option>
              <option value="confirmed" ${b.status==='confirmed'?'selected':''}>confirmed</option>
              <option value="cancelled" ${b.status==='cancelled'?'selected':''}>cancelled</option>
            </select>
            <button data-id="${b.id}" class="btn edit-btn">Editar</button>
            <button data-id="${b.id}" class="btn delete-btn" style="background:#b9533a">Excluir</button>
          </div>
        `;
        bookingsList.appendChild(el);
      });

      // wire actions
      $$('.status-select').forEach(sel=> sel.onchange = async (e)=>{
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        await updateDoc(doc(db,'agendamentos', id), { status: newStatus });
      });

      $$('.delete-btn').forEach(btn=> btn.onclick = async (e)=>{
        const id = e.target.dataset.id;
        if (!confirm('Excluir esse agendamento?')) return;
        await deleteDoc(doc(db,'agendamentos', id));
      });

      $$('.edit-btn').forEach(btn=> btn.onclick = async (e)=>{
        const id = e.target.dataset.id;
        // simple inline edit prompt (name, phone, service, professional, datetime)
        const b = LAST_BOOKINGS.find(x=>x.id===id);
        if (!b) return alert('Registro não encontrado');
        const newName = prompt('Nome do cliente:', b.customerName) || b.customerName;
        const newPhone = prompt('Telefone:', b.phone || '') || (b.phone||'');
        const newService = prompt('Serviço:', b.service) || b.service;
        const newProfessional = prompt('Profissional:', b.professional) || b.professional;
        const newDatetime = prompt('Data e hora (YYYY-MM-DDTHH:MM):', (new Date(b.datetime)).toISOString().slice(0,16)) || new Date(b.datetime).toISOString();
        await updateDoc(doc(db,'agendamentos', id), {
          customerName: newName,
          phone: newPhone,
          service: newService,
          professional: newProfessional,
          datetime: new Date(newDatetime).toISOString()
        });
      });
    }
  });
}

// helper
function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]); }
