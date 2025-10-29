// app.js
// Use como <script type="module" src="app.js"></script> em index.html e admin.html

import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// util
function $qs(sel){ return document.querySelector(sel) }

// determine page type
const path = location.pathname.split('/').pop().toLowerCase();
if (!path || path === '' || path === 'index.html') {
  runClient();
} else if (path === 'admin.html') {
  runAdmin();
} else {
  // nothing
}

/* ==========================
   CLIENT (index.html) CODE
   ========================== */
function runClient(){
  // build UI if not present
  document.addEventListener('DOMContentLoaded', () => {
    // if form exists, wire it
    const form = $qs('#booking-form');
    const servicesSel = $qs('#service');
    if (servicesSel && servicesSel.children.length === 0) {
      const services = [
        "Manicure", "Unha de Gel", "Banho de Gel", "Fibra de Vidro", "Postiça Realista",
        "Escova Simples", "Mechas", "Coloração"
      ];
      for (const s of services){
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        servicesSel.appendChild(opt);
      }
    }

    if (form) form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = $qs('#name').value.trim();
      const phone = $qs('#phone').value.trim();
      const service = $qs('#service').value;
      const datetime = $qs('#datetime').value; // ISO or datetime-local
      if (!name || !service || !datetime) {
        alert('Preencha nome, serviço e data/hora.');
        return;
      }
      try {
        await addDoc(collection(db, 'bookings'), {
          customerName: name,
          phone: phone,
          service: service,
          datetime: new Date(datetime).toISOString(),
          status: 'pending',
          createdAt: serverTimestamp()
        });
        $qs('#booking-form').reset();
        $qs('#result').innerHTML = '<strong>Agendamento recebido!</strong> Aguarde confirmação.';
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar. Tenta de novo.');
      }
    });
  });
}

/* ==========================
   ADMIN (admin.html) CODE
   ========================== */
function runAdmin(){
  document.addEventListener('DOMContentLoaded', () => {
    const loginForm = $qs('#login-form');
    const logoutBtn = $qs('#logout-btn');
    const adminArea = $qs('#admin-area');
    const authMsg = $qs('#auth-msg');
    const bookingsList = $qs('#bookings-list');

    // login
    if (loginForm) {
      loginForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const email = $qs('#email').value.trim();
        const pass = $qs('#password').value.trim();
        try {
          await signInWithEmailAndPassword(auth, email, pass);
        } catch(err){
          alert('Erro no login: ' + (err.message||err));
        }
      });
    }

    // logout
    if (logoutBtn) logoutBtn.addEventListener('click', ()=> signOut(auth));

    // auth state
    let unsubBookings = null;
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // check role in users collection
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? (userDoc.data().role || '') : '';
        if (role !== 'admin') {
          authMsg.innerText = 'Conta sem permissão admin. Peça pro dono criar o user com role=admin.';
          adminArea.style.display = 'none';
          return;
        }
        adminArea.style.display = 'block';
        authMsg.innerText = `Olá, ${user.email}`;
        // subscribe bookings
        const q = query(collection(db,'bookings'), orderBy('createdAt','desc'));
        unsubBookings = onSnapshot(q, snap=>{
          bookingsList.innerHTML = '';
          snap.forEach(docSnap=>{
            const b = { id: docSnap.id, ...docSnap.data() };
            const item = document.createElement('div');
            item.className = 'admin-booking';
            item.innerHTML = `
              <div><strong>${escapeHtml(b.service)}</strong> — ${new Date(b.datetime).toLocaleString()}<br>
               Cliente: ${escapeHtml(b.customerName)} — ${escapeHtml(b.phone || '')}
              </div>
              <div class="admin-actions">
                <select data-id="${b.id}" class="status-select">
                  <option ${b.status==='pending'?'selected':''}>pending</option>
                  <option ${b.status==='confirmed'?'selected':''}>confirmed</option>
                  <option ${b.status==='cancelled'?'selected':''}>cancelled</option>
                </select>
                <button data-id="${b.id}" class="delete-btn">Excluir</button>
              </div>`;
            bookingsList.appendChild(item);
          });

          // wire actions
          bookingsList.querySelectorAll('.status-select').forEach(sel=>{
            sel.onchange = async (ev)=>{
              const id = ev.target.dataset.id;
              const newStatus = ev.target.value;
              await updateDoc(doc(db,'bookings', id), { status: newStatus });
            };
          });
          bookingsList.querySelectorAll('.delete-btn').forEach(btn=>{
            btn.onclick = async (ev)=>{
              const id = ev.target.dataset.id;
              if (confirm('Excluir esse agendamento?')) {
                await deleteDoc(doc(db,'bookings', id));
              }
            };
          });
        });
      } else {
        // logged out
        if (unsubBookings) { unsubBookings(); unsubBookings = null; }
        adminArea.style.display = 'none';
        authMsg.innerText = 'Faça login com sua conta de funcionária.';
      }
    });
  });
}

// small helper
function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]); }
