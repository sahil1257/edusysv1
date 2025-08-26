import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { generateInitialsAvatar, showConfirmationModal, showToast, timeAgo, openAdvancedMessageModal, openFormModal } from '../utils/helpers.js';

// --- প্রধান ফাংশন ---
export async function renderNoticesPage() {
    await Promise.all([
        store.refresh('notices'),
        store.refresh('users'),
        store.refresh('sections'),
        store.refresh('timetable')
    ]);

    if (currentUser.role === 'Teacher') {
        renderTeacherSectionSelector();
    } else {
        renderGenericNoticeList();
    }
}

// --- শিক্ষকদের জন্য প্রিমিয়াম সেকশন বাছাই করার UI ---
function renderTeacherSectionSelector() {
    const allSections = store.get('sections');
    const timetable = store.get('timetable');

    const mySectionIds = new Set();
    allSections.forEach(section => {
        if (section.classTeacherId?.id === currentUser.teacherId) mySectionIds.add(section.id);
    });
    timetable.forEach(entry => {
        if (entry.teacherId?.id === currentUser.teacherId && entry.sectionId?.id) mySectionIds.add(entry.sectionId.id);
    });

    const mySections = Array.from(mySectionIds).map(id => {
        const section = allSections.find(s => s.id === id);
        if (!section) return null; // যদি সেকশন না পাওয়া যায়
        const studentCount = store.get('students').filter(st => st.sectionId?.id === id).length;
        return { ...section, studentCount };
    }).filter(Boolean); // null ভ্যালু বাদ দেওয়ার জন্য

    ui.contentArea.innerHTML = `
        <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in">
            <div class="mb-6">
                <h3 class="text-2xl font-bold text-white">Select a Section</h3>
                <p class="text-slate-400 mt-1">Choose a section to manage notices.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                ${mySections.length > 0 ? mySections.map(section => `
                    <div class="section-card-notice group" 
                         data-section-id="${section.id}" 
                         data-section-name="${section.name}" 
                         data-subject-name="${section.subjectId?.name || 'N/A'}">
                        <div class="flex items-center gap-4">
                            <div class="card-icon"><i class="fas fa-users"></i></div>
                            <div>
                                <h4 class="card-title">Section ${section.name}</h4>
                                <p class="card-subtitle">${section.subjectId?.name || 'N/A'}</p>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right card-arrow"></i>
                    </div>
                `).join('') : `
                <div class="col-span-full text-center py-12 text-slate-500">
                    You are not assigned to any sections.
                </div>`}
            </div>
        </div>
    `;

    // **FIX**: প্রতিটি সেকশন কার্ডে ক্লিক ইভেন্ট যোগ করা
    document.querySelectorAll('.section-card-notice').forEach(card => {
        card.onclick = () => {
            const section = {
                id: card.dataset.sectionId,
                name: card.dataset.sectionName,
                subjectName: card.dataset.subjectName
            };
            renderNoticeListForSection(section);
        };
    });
}

// --- নির্দিষ্ট সেকশনের জন্য নোটিশ লিস্ট দেখানোর UI ---
function renderNoticeListForSection(section) {
    const sectionNotices = store.get('notices')
        .filter(n => n.target === `section_${section.id}`)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    ui.contentArea.innerHTML = `
        <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in">
            <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <div>
                    <button id="back-to-sections" class="text-sm text-blue-400 hover:underline mb-2 flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> Back to Sections
                    </button>
                    <h3 class="text-2xl font-bold text-white">Notices for ${section.subjectName} - Section ${section.name}</h3>
                 </div>
                <button id="add-section-notice-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <i class="fas fa-plus"></i> Create Notice
                </button>
            </div>
            <div id="notice-list-container" class="space-y-6">
                ${sectionNotices.length > 0 ? sectionNotices.map(notice => createPremiumNoticeCard(notice)).join('') : `<div class="text-center py-16 text-slate-400"><p>No notices found for this section.</p></div>`}
            </div>
        </div>`;

    document.getElementById('back-to-sections').onclick = renderTeacherSectionSelector;
    document.getElementById('add-section-notice-btn').onclick = () => openSectionNoticeModal(section);
    attachNoticeActionListeners();
}

// (বাকি ফাংশনগুলো অপরিবর্তিত)
function openSectionNoticeModal(section) {
    const formFields = [{ name: 'title', label: 'Notice Title', type: 'text', required: true }, { name: 'content', label: 'Notice Content', type: 'textarea', required: true, rows: 5 }];
    openFormModal(`New Notice for Section ${section.name}`, formFields, async (formData) => {
        const noticeData = { ...formData, date: new Date().toISOString(), authorId: currentUser.id, type: 'notice', target: `section_${section.id}` };
        if (await apiService.create('notices', noticeData)) {
            showToast('Notice posted!', 'success');
            await store.refresh('notices');
            renderNoticeListForSection(section);
        }
    });
}

function renderGenericNoticeList() {
    const allNotices = store.get('notices');
    const relevantNotices = allNotices.filter(n => {
        if (n.authorId === currentUser.id) return true;
        if (n.type === 'private_message' && n.target === currentUser.id) return true;
        if (n.type === 'notice') {
            switch (currentUser.role) {
                case 'Admin': return ['All', 'Staff', 'Teacher', 'Student'].includes(n.target);
                case 'Teacher': return ['All', 'Staff', 'Teacher'].includes(n.target);
                case 'Student': return ['All', 'Student', `section_${currentUser.sectionId}`].includes(n.target);
                default: return ['All', 'Staff'].includes(n.target);
            }
        } return false;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    ui.contentArea.innerHTML = `<div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in"><div class="flex justify-between items-center mb-6"><h3 class="text-2xl font-bold text-white">Notice Board</h3>${currentUser.role === 'Admin' ? `<button id="add-new-notice-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Create</button>` : ''}</div><div id="notice-list-container" class="space-y-6">${relevantNotices.length > 0 ? relevantNotices.map(createPremiumNoticeCard).join('') : `<div class="text-center py-16 text-slate-400"><p>No notices found.</p></div>`}</div></div>`;
    
    document.getElementById('add-new-notice-btn')?.addEventListener('click', () => openAdvancedMessageModal());
    attachNoticeActionListeners();
}

// in frontend/src/pages/notices.js

// ... (keep all other existing functions like renderNoticesPage, etc., as they are)


// --- REPLACE THE OLD FUNCTION WITH THIS NEW VERSION ---
export function createPremiumNoticeCard(notice) {
    const allUsersMap = new Map(store.get('users').map(u => [u.id, u]));
    allUsersMap.set(currentUser.id, currentUser);
    const author = allUsersMap.get(notice.authorId) || { name: 'School Admin', profileImage: null };

    // Group reactions by emoji to get counts and user lists
    const reactionsGrouped = (notice.reactions || []).reduce((acc, reaction) => {
        const user = allUsersMap.get(reaction.userId.toString());
        if (user) {
            if (!acc[reaction.type]) {
                acc[reaction.type] = [];
            }
            acc[reaction.type].push(user.name);
        }
        return acc;
    }, {});

    // ... (ribbon logic remains the same as before) ...
    let ribbonContent;
    if (notice.type === 'private_message') {
        ribbonContent = `<div class="card-ribbon bg-purple-500/20 text-purple-400">Private Message</div>`;
    } else if (notice.target.startsWith('section_')) {
        const section = store.get('sections').find(s => s.id === notice.target.replace('section_', ''));
        ribbonContent = `<div class="card-ribbon bg-rose-500/20 text-rose-400">For Section ${section?.name || ''}</div>`;
    } else {
        const targetText = { 'All': 'Public', 'Student': 'For Students', 'Teacher': 'For Teachers' }[notice.target] || 'Notice';
        const ribbonColor = { 'All': 'blue', 'Student': 'green', 'Teacher': 'amber' }[notice.target] || 'gray';
        ribbonContent = `<div class="card-ribbon bg-${ribbonColor}-500/20 text-${ribbonColor}-400">${targetText}</div>`;
    }

    let actionButtons = '';
    if (currentUser.role === 'Admin' || notice.authorId === currentUser.id) {
        actionButtons = `<button class="delete-btn" title="Delete" data-id="${notice.id}"><i class="fas fa-trash-alt"></i></button>`;
    }
    
    let reactionSectionHtml = '';
    if (notice.type === 'notice') {
        reactionSectionHtml = `
            <div class="mt-4 pt-4 border-t border-slate-700/50">
                <div class="flex items-center gap-2 flex-wrap">
                    <!-- Display existing reactions -->
                    ${Object.entries(reactionsGrouped).map(([emoji, users]) => `
                        <button class="existing-reaction-btn" title="Reacted by: ${users.join(', ')}" data-users="${users.join(', ')}" data-emoji="${emoji}">
                            <span class="text-lg">${emoji}</span>
                            <span class="font-semibold text-sm">${users.length}</span>
                        </button>
                    `).join('')}

                    <!-- The 'Add Reaction' button -->
                    <div class="relative">
                        <button class="add-reaction-btn" title="Add Reaction" data-id="${notice.id}">
                            <i class="far fa-smile"></i>
                            <i class="fas fa-plus"></i>
                        </button>
                        <!-- The emoji picker will be injected here by the script -->
                        <div class="emoji-picker-container"></div>
                    </div>
                </div>
            </div>
            
            <style>
                .existing-reaction-btn, .add-reaction-btn {
                    padding: 4px 10px;
                    border-radius: 20px;
                    background-color: rgba(71, 85, 105, 0.4);
                    border: 1px solid rgba(147, 197, 253, 0.4);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease-in-out;
                    color: #d1d5db;
                }
                .existing-reaction-btn:hover {
                     background-color: rgba(99, 102, 241, 0.3);
                }
                .add-reaction-btn {
                    padding: 4px 6px;
                    position: relative;
                }
                .add-reaction-btn:hover {
                    transform: scale(1.1);
                }
                .add-reaction-btn .fa-plus {
                    font-size: 8px;
                    position: absolute;
                    bottom: 0px;
                    right: 0px;
                    background: #4a5568;
                    border-radius: 50%;
                    padding: 2px;
                }
                .emoji-picker-container {
                    position: absolute;
                    bottom: 120%;
                    left: 0;
                    z-index: 10;
                }
                /* Style for the emoji picker itself */
                emoji-picker {
                    --background: #2d3748; /* bg-slate-800 */
                    --border-color: #4a5568; /* bg-slate-600 */
                    --indicator-color: #6366f1; /* indigo-500 */
                }
            </style>
        `;
    }

    return `
    <div class="premium-notice-card">
        ${ribbonContent}
        <div class="p-5">
            <div class="flex justify-between items-start gap-2">
                <h4 class="text-xl font-bold text-white">${notice.title}</h4>
                <div class="flex items-center gap-4">
                     <div class="text-right">
                        <p class="text-sm font-medium text-slate-300">${author.name}</p>
                        <p class="text-xs text-slate-500">${timeAgo(notice.date)}</p>
                    </div>
                    <img src="${author.profileImage || generateInitialsAvatar(author.name)}" alt="${author.name}" class="w-9 h-9 rounded-full object-cover">
                    <div class="card-actions">${actionButtons}</div>
                </div>
            </div>
            <p class="text-slate-300 whitespace-pre-wrap mt-2">${notice.content}</p>
            ${reactionSectionHtml}
        </div>
    </div>`;
}


// --- REPLACE THE OLD LISTENER FUNCTION WITH THIS ENTIRE NEW BLOCK ---
export function attachNoticeActionListeners() {
    // --- Close any open emoji picker when clicking outside ---
    document.body.addEventListener('click', (e) => {
        if (!e.target.closest('.add-reaction-btn') && !e.target.closest('emoji-picker')) {
            document.querySelectorAll('.emoji-picker-container').forEach(c => c.innerHTML = '');
        }
    }, true); // Use capture phase to ensure it runs first

    // --- Delete Button Listener (remains the same) ---
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => showConfirmationModal('Are you sure you want to delete this notice?', async () => {
            if (await apiService.remove('notices', btn.dataset.id)) {
                showToast('Notice removed.', 'success');
                renderNoticesPage();
            }
        });
    });

    // --- 'Add Reaction' Button Listener ---
    document.querySelectorAll('.add-reaction-btn').forEach(btn => {
        btn.onclick = (event) => {
            event.stopPropagation(); // Prevents the body click listener from firing immediately
            const container = btn.nextElementSibling;

            // If picker is already open, close it. Otherwise, open a new one.
            if (container.querySelector('emoji-picker')) {
                container.innerHTML = '';
                return;
            }
            // Close all other pickers
            document.querySelectorAll('.emoji-picker-container').forEach(c => c.innerHTML = '');

            const noticeId = btn.dataset.id;
            const picker = document.createElement('emoji-picker');
            
            // Listen for an emoji to be selected from the picker
            picker.addEventListener('emoji-click', async (e) => {
                const selectedEmoji = e.detail.unicode;
                container.innerHTML = ''; // Close the picker immediately

                const result = await apiService.reactToNotice(noticeId, selectedEmoji);
                if (result) {
                    await store.refresh('notices');
                    renderNoticesPage(); // Re-render everything with the new reaction
                }
            });
            container.appendChild(picker);
        };
    });
    
    // --- Existing Reaction Button Listener (to show who reacted) ---
    document.querySelectorAll('.existing-reaction-btn').forEach(btn => {
        btn.onclick = () => {
            const users = btn.dataset.users.split(',');
            const emoji = btn.dataset.emoji;
            
            // Use the generic modal to display the list of users
            ui.modalTitle.textContent = `Reacted with ${emoji}`;
            ui.modalBody.innerHTML = `
                <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    ${users.map(name => `<p class="p-2 bg-slate-700 rounded-md text-white">${name}</p>`).join('')}
                </div>
            `;
            
            // A simple way to show the modal without a form
            const modalContent = ui.modal.querySelector('.modal-content');
            modalContent.classList.remove('!max-w-4xl'); // Ensure it's not extra wide
            ui.modal.style.display = 'flex';
            setTimeout(() => ui.modal.classList.add('show'), 10);
        };
    });
}