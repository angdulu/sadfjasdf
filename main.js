
class ItemCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const riskLevel = this.getAttribute('risk');
        let riskColor, riskIcon;

        switch (riskLevel) {
            case 'Low':
                riskColor = 'var(--risk-low-color)';
                riskIcon = `<svg class="risk-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
                break;
            case 'Medium':
                riskColor = 'var(--risk-medium-color)';
                riskIcon = `<svg class="risk-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
                break;
            case 'High':
                riskColor = 'var(--risk-high-color)';
                riskIcon = `<svg class="risk-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
                break;
            default:
                riskColor = 'var(--secondary-color)';
                riskIcon = '';
        }

        this.shadowRoot.innerHTML = `
            <style>
                /* All the styles from the previous CSS file are assumed to be here */
                .flip-card { background-color: transparent; width: 100%; height: 450px; border-radius: 15px; perspective: 1000px; }
                .flip-card-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.8s; transform-style: preserve-3d; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border-radius: 15px; }
                .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
                .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; border-radius: 15px; overflow: hidden; display: flex; flex-direction: column; }
                .flip-card-front { background-color: #ffffff; }
                .flip-card-back { background-color: #ffffff; transform: rotateY(180deg); padding: 1.5rem; justify-content: center; }
                .card-image { width: 100%; height: 200px; object-fit: cover; }
                .card-header { padding: 1rem; color: #fff; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                .risk-icon { width: 24px; height: 24px; }
                .card-content { padding: 1rem; flex-grow: 1; text-align: left; }
                h3 { margin-top: 0; font-size: 1.5rem; }
                .recommendation { font-style: italic; background-color: #f8f9fa; padding: 0.8rem; border-left: 4px solid #007BFF; border-radius: 5px; margin-top: 1rem; text-align: left; }
            </style>
            <div class="flip-card">
                <div class="flip-card-inner">
                    <div class="flip-card-front">
                        <div class="card-header" style="background-color: ${riskColor};">
                            ${riskIcon}
                            <span>${this.getAttribute('name')}</span>
                        </div>
                        <img class="card-image" src="${this.getAttribute('image')}" alt="${this.getAttribute('name')}">
                        <div class="card-content">
                            <p><i>Click for details</i></p>
                        </div>
                    </div>
                    <div class="flip-card-back">
                        <h3>${this.getAttribute('name')}</h3>
                        <p>${this.getAttribute('description')}</p>
                        <p class="recommendation"><strong>Recommendation:</strong> ${this.getAttribute('recommendation')}</p>
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
        displayItems(items);
    })
    .catch(error => console.error('Error fetching items:', error));

function displayItems(itemsToDisplay) {
    itemGrid.innerHTML = '';
    itemsToDisplay.forEach(item => {
        const itemCard = document.createElement('item-card');
        itemCard.setAttribute('name', item.name);
        itemCard.setAttribute('risk', item.risk);
        itemCard.setAttribute('description', item.description);
        itemCard.setAttribute('image', item.image);
        itemCard.setAttribute('recommendation', item.recommendation);
        itemGrid.appendChild(itemCard);
    });
}

searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm)
    );
    displayItems(filteredItems);
});
