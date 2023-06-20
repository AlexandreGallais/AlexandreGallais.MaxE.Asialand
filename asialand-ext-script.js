const variable = {
    key: "asialand-ext-value",
    tva: 1.2,
    profit: 1.00,
    active: false,
};





class PriceEl {
    #defaultHtml;
    #element;

    #observer = new MutationObserver(() => {});

    #tva;
    #observe;

    calculate = () => {
        this.#observer.disconnect();

        this.#defaultHtml = this.#element.innerHTML;

        const priceStringSanitized = this.#defaultHtml.match(/[0-9,.]/g).join("").replace(",", ".");
        const defaultPrice = Number(priceStringSanitized);

        let price = defaultPrice;

        price = price * variable.profit; // Option A

        if (this.#tva) {
            price = price * variable.tva;
        }

        // price = price + ((defaultPrice * variable.profit) - defaultPrice); // Option B

        price = price.toFixed(2);

        this.#element.innerHTML = `${price} €`;
        this.#element.style.color = "red";

        if (!this.#observe) {
            return;
        }

        this.#observer = new MutationObserver(() => {
            this.calculate();
        });
    
        this.#observer.observe(this.#element, { childList: true });
    }

    /**
     * @param {HTMLElement} element
     * @param {Boolean} tva
     * @param {Boolean} observe
     */
    constructor(element, tva = false, observe = false) {
        this.#element = element;
        this.#tva = tva;
        this.#observe = observe;

        this.calculate();
    }
}





/** @type {PriceEl[]} */
let priceArray = [];
/** @type {PriceEl} */
let priceSideCart;
/** @type {PriceEl} */
let priceCart;

const populatePriceArray = () => {
    priceArray = [];

    document.querySelectorAll("div.sld-product-price-total").forEach(/** @param {HTMLDivElement} x */ (x) => {
        priceArray.push(new PriceEl(x, true, true));
    })
};

const inputChange = (event) => {
    chrome.storage.local.set({ [variable.key]: JSON.stringify({
        tva: event.target.name === "tva" ? Number(event.target.value) : variable.tva,
        profit: event.target.name === "profit" ? Number(event.target.value) : variable.profit,
        active: event.target.name === "active" ? event.target.checked : variable.active,
    })}).then(() => {
        if (event.target.name === "active" && (event.target.checked !== variable.active)) {
            self.location.reload();
        }
    });
};

const run = () => {
    const custMenuEl = document.querySelector(".dropdown-customer-account-links ul");

    if (!custMenuEl) {
        return;
    }

    // Create menu
    const inputProfit = document.createElement("input");
    inputProfit.type = "number";
    inputProfit.min = 1;
    inputProfit.max = 2;
    inputProfit.step = 0.01;
    inputProfit.value = variable.profit;
    inputProfit.name = "profit";
    inputProfit.addEventListener("change", (event) => inputChange(event))

    const liProfit = document.createElement("li");
    liProfit.innerText = "Profit:";
    liProfit.appendChild(inputProfit);
    liProfit.className = "asialand-ext-li";

    custMenuEl.prepend(liProfit);

    const inputTva = document.createElement("input");
    inputTva.type = "number";
    inputTva.min = 1;
    inputTva.max = 2;
    inputTva.step = 0.01;
    inputTva.value = variable.tva;
    inputTva.name = "tva";
    inputTva.addEventListener("change", (event) => inputChange(event))

    const liTva = document.createElement("li");
    liTva.innerText = "TVA:";
    liTva.appendChild(inputTva);
    liTva.className = "asialand-ext-li";

    custMenuEl.prepend(liTva);

    const inputActive = document.createElement("input");
    inputActive.type = "checkbox";
    inputActive.checked = variable.active;
    inputActive.name = "active";
    inputActive.addEventListener("change", (event) => inputChange(event))

    const liActive = document.createElement("li");
    liActive.innerText = "Active:";
    liActive.appendChild(inputActive);
    liActive.className = "asialand-ext-li";

    custMenuEl.prepend(liActive);

    if (!variable.active) {
        return;
    }

    populatePriceArray();

    const productsObs = new MutationObserver(() => {
        populatePriceArray();
    });

    // Catalog product list
    const productsEl = document.querySelector("#products");

    if (productsEl) {
        productsObs.observe(productsEl, { childList: true });
    }

    // Side cart total
    const sideCartEl = document.querySelector("#js-cart-sidebar");

    if (sideCartEl) {
        const fn = () => {
            sideCartEl.querySelectorAll(".cart-product-line").forEach(x => {
                /** @type {HTMLElement} */
                const productPriceEl = x.querySelector(".product-price");

                console.log(productPriceEl);

                if (!productPriceEl) {
                    return;
                }

                productPriceEl.style.visibility = "hidden";
                productPriceEl.style.width = "0";
            });

            sideCartEl.querySelectorAll(".cart-subtotals").forEach(x => {
                x.style.visibility = "hidden";
                x.style.height = "0";
            });
        };

        const sideCartTotalEl = document.querySelector("#js-cart-sidebar .price-total");

        if (sideCartTotalEl) {
            priceSideCart = new PriceEl(document.querySelector("#js-cart-sidebar .price-total"));
        }
        
        const cartSideObs = new MutationObserver(() => {
            cartSideObs.disconnect();

            const sideCartTotalEl = document.querySelector("#js-cart-sidebar .price-total");

            if (sideCartTotalEl) {
                priceSideCart = new PriceEl(sideCartTotalEl);
            }

            fn();

            cartSideObs.observe(sideCartEl, { childList: true });
        });

        fn();

        cartSideObs.observe(sideCartEl, { childList: true });
    }

    // https://www.asialand.fr/panier?action=show (product list)
    const cartContainerEl = document.querySelector(".cart-container");

    if (cartContainerEl) {
        productsObs.observe(cartContainerEl, { childList: true });
    }

    // https://www.asialand.fr/panier?action=show Cart total
    const cartSumEl = document.querySelector(".cart-summary");

    if (cartSumEl) {
        const fn = () => {
            cartSumEl.querySelectorAll(".cart-total").forEach(x => {
                if (x.querySelector("label")?.innerText !== "Total TTC") {
                    return;
                }
    
                const priceEl = x.querySelector(".price-total");
    
                if (!priceEl) {
                    return;
                }
    
                priceCart = new PriceEl(priceEl);
            });
        };
        
        fn();
        
        const cartObs = new MutationObserver(() => {
            fn();
        });

        cartObs.observe(cartSumEl, { childList: true });
    }

    // Header cart button
    const cartModuleEl = document.querySelector(".shopping-cart-module .blockcart.cart-preview");

    if (cartModuleEl) {
        const fn = () => {
            cartModuleEl.querySelectorAll(".cart-total-value").forEach(x => {
                x.style.visibility = "hidden";
            })
        };

        fn();

        const cartObs = new MutationObserver(() => {
            fn();
        });

        cartObs.observe(cartModuleEl, { childList: true });
    }
};





window.addEventListener("load", () => {
    chrome.storage.local.get(variable.key, (res) => {
        let obj = {};

        if (res[variable.key]) {
            obj = JSON.parse(res[variable.key]);
        }

        if (obj.tva) variable.tva = obj.tva;
        if (obj.profit) variable.profit = obj.profit;
        if (obj.active) variable.active = obj.active;

        run();
    });
});