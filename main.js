
import { scoreItem, validateItem } from './score.js';

const ocrFileInput = document.getElementById('ocr-file');
const ocrLangSelect = document.getElementById('ocr-lang');
const ocrRunButton = document.getElementById('ocr-run');
const ocrStatus = document.getElementById('ocr-status');
const ocrOutput = document.getElementById('ocr-output');
const ocrPreview = document.getElementById('ocr-preview');

let ocrFile = null;

if (ocrFileInput) {
    ocrFileInput.addEventListener('change', (event) => {
        const [file] = event.target.files;
        ocrFile = file || null;
        if (ocrFile) {
            const url = URL.createObjectURL(ocrFile);
            ocrPreview.src = url;
            ocrPreview.style.display = 'block';
            ocrStatus.textContent = 'Status: Ready to run OCR';
        } else {
            ocrPreview.style.display = 'none';
            ocrStatus.textContent = 'Status: Idle';
        }
    });
}

if (ocrRunButton) {
    ocrRunButton.addEventListener('click', async () => {
        if (!ocrFile) {
            ocrStatus.textContent = 'Status: Please choose an image first.';
            return;
        }
        if (!window.Tesseract) {
            ocrStatus.textContent = 'Status: OCR engine not loaded.';
            return;
        }

        ocrRunButton.disabled = true;
        ocrStatus.textContent = 'Status: OCR running...';
        ocrOutput.value = '';

        try {
            const lang = ocrLangSelect?.value || 'kor+eng';
            const result = await window.Tesseract.recognize(ocrFile, lang, {
                logger: (message) => {
                    if (message.status && message.progress != null) {
                        const pct = Math.round(message.progress * 100);
                        ocrStatus.textContent = `Status: ${message.status} (${pct}%)`;
                    }
                }
            });
            const text = result?.data?.text?.trim() || '';
            ocrOutput.value = text || 'No text detected.';
            ocrStatus.textContent = 'Status: OCR complete.';
        } catch (error) {
            console.error(error);
            ocrStatus.textContent = 'Status: OCR failed. Try a clearer image.';
        } finally {
            ocrRunButton.disabled = false;
        }
    });
}

class ItemCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.item = null;
    }

    connectedCallback() {
        if (this.item) {
            this.render();
        }
    }

    set data(item) {
        this.item = item;
        if (this.isConnected) {
            this.render();
        }
    }

    render() {
        const item = this.item;
        if (!item) {
            return;
        }

        const scored = scoreItem(item);
        const riskLevel = scored.level;
        const riskMeta = getRiskMeta(riskLevel);

        const renderField = (label, field) => `
            <div class="field">
                <div class="field-label">${label}</div>
                <div class="field-value">${escapeHtml(field?.value ?? 'Unavailable')}</div>
                <div class="field-source">Source: ${escapeHtml(field?.source ?? 'Unspecified')}</div>
            </div>
        `;

        this.shadowRoot.innerHTML = `
            <style>
                .flip-card { background-color: transparent; width: 100%; height: 520px; border-radius: 15px; perspective: 1000px; }
                .flip-card-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.8s; transform-style: preserve-3d; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border-radius: 15px; }
                .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
                .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; border-radius: 15px; overflow: hidden; display: flex; flex-direction: column; }
                .flip-card-front { background-color: #ffffff; }
                .flip-card-back { background-color: #ffffff; transform: rotateY(180deg); padding: 1.2rem 1.5rem; justify-content: flex-start; text-align: left; overflow-y: auto; }
                .card-image { width: 100%; height: 200px; object-fit: cover; }
                .card-header { padding: 1rem; color: #fff; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                .risk-icon { width: 24px; height: 24px; }
                .card-content { padding: 1rem; flex-grow: 1; text-align: left; }
                h3 { margin: 0 0 0.6rem 0; font-size: 1.4rem; }
                .tag { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.6rem; border-radius: 999px; background: ${riskMeta.badge}; color: #fff; font-size: 0.85rem; font-weight: 700; }
                .note { margin: 0.6rem 0 0.8rem 0; font-size: 0.9rem; color: #495057; }
                .field { margin-bottom: 0.7rem; }
                .field-label { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: #495057; }
                .field-value { margin-top: 0.2rem; font-size: 0.95rem; color: #212529; }
                .field-source { margin-top: 0.2rem; font-size: 0.78rem; color: #6c757d; }
                .section-title { margin: 1rem 0 0.5rem 0; font-size: 0.95rem; font-weight: 700; color: #343a40; }
                .recommendation { font-style: italic; background-color: #f8f9fa; padding: 0.8rem; border-left: 4px solid #007BFF; border-radius: 5px; margin-top: 0.8rem; }
            </style>
            <div class="flip-card">
                <div class="flip-card-inner">
                    <div class="flip-card-front">
                        <div class="card-header" style="background-color: ${riskMeta.color};">
                            ${riskMeta.icon}
                            <span>${escapeHtml(item.name.value)}</span>
                        </div>
                        <img class="card-image" src="${escapeHtml(item.image.value)}" alt="${escapeHtml(item.name.value)}">
                        <div class="card-content">
                            <div class="tag">${escapeHtml(riskLevel)}</div>
                            <p class="note">Hazard and risk are shown separately. Click for details.</p>
                            <div class="field-source">Source (name): ${escapeHtml(item.name.source)}</div>
                            <div class="field-source">Source (image): ${escapeHtml(item.image.source)}</div>
                            <div class="field-source">Source (risk level): ${escapeHtml(item.risk.level.source)}</div>
                        </div>
                    </div>
                    <div class="flip-card-back">
                        <h3>${escapeHtml(item.name.value)}</h3>
                        <div class="section-title">Item</div>
                        ${renderField('Name', item.name)}
                        ${renderField('Image URL', item.image)}
                        <div class="section-title">Hazard</div>
                        ${renderField('Hazard Summary', item.hazard.summary)}
                        ${renderField('Evidence Grade', item.hazard.evidence_grade)}
                        ${renderField('Uncertainty Interval', item.hazard.uncertainty_interval)}
                        <div class="section-title">Exposure</div>
                        ${renderField('Exposure Summary', item.exposure.summary)}
                        ${renderField('Exposure Availability', item.exposure.availability)}
                        <div class="section-title">Risk</div>
                        ${renderField('Risk Summary', item.risk.summary)}
                        ${renderField('Risk Level', item.risk.level)}
                        ${renderField('Evidence Grade', item.risk.evidence_grade)}
                        ${renderField('Uncertainty Interval', item.risk.uncertainty_interval)}
                        ${scored.indeterminate ? `<p class="note"><strong>Risk indeterminate:</strong> ${escapeHtml(scored.reason)}.</p>` : ''}
                        <div class="recommendation">
                            <strong>Recommendation:</strong> ${escapeHtml(item.recommendation.value)}
                            <div class="field-source">Source: ${escapeHtml(item.recommendation.source)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.querySelector('.flip-card').addEventListener('click', () => {
            this.shadowRoot.querySelector('.flip-card').classList.toggle('flipped');
        });
    }
}

customElements.define('item-card', ItemCard);

const itemGrid = document.getElementById('item-grid');
const searchBar = document.getElementById('search-bar');
let items = [];

fetch('items.json')
    .then(response => response.json())
    .then(data => {
        items = data;
        const errors = items.flatMap(item => validateItem(item).map(error => `${item.name?.value || 'Unknown'}: ${error}`));
        if (errors.length > 0) {
            console.warn('Validation issues:', errors);
        }
        displayItems(items);
    })
    .catch(error => console.error('Error fetching items:', error));

function displayItems(itemsToDisplay) {
    itemGrid.innerHTML = '';
    itemsToDisplay.forEach(item => {
        const itemCard = document.createElement('item-card');
        itemCard.data = item;
        itemGrid.appendChild(itemCard);
    });
}

searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredItems = items.filter(item =>
        item.name.value.toLowerCase().includes(searchTerm)
    );
    displayItems(filteredItems);
});

function getRiskMeta(level) {
    switch (level) {
        case 'Low':
            return { color: 'var(--risk-low-color)', badge: 'var(--risk-low-color)', icon: iconCheck() };
        case 'Medium':
            return { color: 'var(--risk-medium-color)', badge: 'var(--risk-medium-color)', icon: iconWarn() };
        case 'High':
            return { color: 'var(--risk-high-color)', badge: 'var(--risk-high-color)', icon: iconAlert() };
        case 'Indeterminate':
            return { color: 'var(--risk-indeterminate-color)', badge: 'var(--risk-indeterminate-color)', icon: iconUnknown() };
        default:
            return { color: 'var(--secondary-color)', badge: 'var(--secondary-color)', icon: '' };
    }
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function iconCheck() {
    return `<svg class="risk-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
}

function iconWarn() {
    return `<svg class="risk-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
}

function iconAlert() {
    return `<svg class="risk-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
}

function iconUnknown() {
    return `<svg class="risk-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17h-1.9v-1.9H12V19zm2.1-7.8c-.2.5-.5.9-1 1.4l-.8.8c-.4.4-.6.9-.6 1.5v.6h-1.9v-.7c0-.8.3-1.5.9-2.1l1-1c.3-.3.5-.6.5-1 0-.8-.6-1.4-1.6-1.4-1 0-1.7.5-2.1 1.5l-1.7-.9C6.4 7 7.6 6 9.7 6c2.2 0 3.6 1.2 3.6 3.1 0 .4-.1.8-.3 1.1z"/></svg>`;
}
