// Substituts minimalistes des composants Home Assistant, pour tester la carte hors HA.

customElements.define("ha-card", class extends HTMLElement {});

customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  connectedCallback() { this._r(); }
  attributeChangedCallback() { this._r(); }
  _r() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" }).innerHTML =
        `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css">
         <style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);align-items:center;justify-content:center;line-height:1}
         i{font-size:var(--mdc-icon-size,24px)}</style><i></i>`;
    }
    const name = (this.getAttribute("icon") || "").replace("mdi:", "");
    this.shadowRoot.querySelector("i").className = `mdi mdi-${name}`;
  }
});

// ha-form simplifié : rend un champ par entrée de schéma et émet value-changed.
customElements.define("ha-form", class extends HTMLElement {
  set hass(h) { this._hass = h; }
  set data(d) { this._data = { ...(d || {}) }; this._render(); }
  set schema(s) { this._schema = s; this._render(); }
  set computeLabel(f) { this._label = f; this._render(); }
  set computeHelper(f) { this._helper = f; }
  _emit() {
    const ev = new Event("value-changed", { bubbles: true, composed: true });
    ev.detail = { value: { ...this._data } };
    this.dispatchEvent(ev);
  }
  _render() {
    if (!this._schema) return;
    this.innerHTML = "";
    this.style.display = "grid";
    this.style.gap = "6px";
    for (const s of this._schema) {
      const sel = s.selector || {};
      const lbl = document.createElement("label");
      lbl.style.cssText = "display:flex;flex-direction:column;font-size:12px;gap:2px";
      lbl.textContent = this._label ? this._label(s) : s.name;
      const v = this._data[s.name];
      let input;
      if (sel.boolean) {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!v;
        input.onchange = () => { this._data[s.name] = input.checked; this._emit(); };
        lbl.style.flexDirection = "row";
      } else if (sel.select) {
        input = document.createElement("select");
        if (sel.select.multiple) input.multiple = true;
        input.appendChild(new Option("—", ""));
        for (const o of sel.select.options) {
          const opt = typeof o === "string" ? new Option(o, o) : new Option(o.label, o.value);
          if (sel.select.multiple ? (v || []).includes(opt.value) : String(v ?? "") === opt.value) opt.selected = true;
          input.appendChild(opt);
        }
        input.onchange = () => {
          this._data[s.name] = sel.select.multiple ? [...input.selectedOptions].map((o) => o.value).filter(Boolean) : input.value;
          this._emit();
        };
      } else if (sel.number) {
        input = document.createElement("input");
        input.type = sel.number.mode === "slider" ? "range" : "number";
        Object.assign(input, { min: sel.number.min ?? "", max: sel.number.max ?? "", step: sel.number.step ?? 1 });
        input.value = v ?? "";
        input.onchange = () => { this._data[s.name] = Number(input.value); this._emit(); };
      } else if (sel.area) {
        input = document.createElement("select");
        input.appendChild(new Option("—", ""));
        for (const a of Object.values((this._hass || {}).areas || {})) {
          const o = new Option(a.name, a.area_id);
          if (a.area_id === v) o.selected = true;
          input.appendChild(o);
        }
        input.onchange = () => { this._data[s.name] = input.value; this._emit(); };
      } else {
        input = document.createElement("input");
        if (sel.entity) {
          const listId = "dl-" + Math.random().toString(36).slice(2);
          const dl = document.createElement("datalist");
          dl.id = listId;
          const doms = [].concat(sel.entity.domain || (sel.entity.filter || []).flatMap((f) => [].concat(f.domain || [])));
          Object.keys((this._hass || {}).states || {}).filter((id) => !doms.length || doms.includes(id.split(".")[0]))
            .forEach((id) => dl.appendChild(new Option(id)));
          lbl.appendChild(dl);
          input.setAttribute("list", listId);
        }
        input.value = Array.isArray(v) ? v.join(", ") : v ?? "";
        input.onchange = () => {
          const multi = (sel.entity && sel.entity.multiple) || (sel.text && sel.text.multiple);
          this._data[s.name] = multi ? input.value.split(",").map((x) => x.trim()).filter(Boolean) : input.value;
          this._emit();
        };
      }
      input.style.cssText += ";padding:4px;font-size:13px";
      lbl.appendChild(input);
      this.appendChild(lbl);
    }
  }
});
