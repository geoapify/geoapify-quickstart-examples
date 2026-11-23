/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const { createApp, ref, reactive, onMounted, onBeforeUnmount } = Vue;

// Reusable component: wraps @geoapify/geocoder-autocomplete
// and emits the selected address as a "select" event
const AddressAutocomplete = {
  props: {
    apiKey: { type: String, required: true },
    options: { type: Object, default: () => ({}) }
  },
  emits: ["select"],
  setup(props, { emit }) {
    const container = ref(null);
    let autocompleteField = null;

    onMounted(() => {
      // The library creates the input inside the container element
      autocompleteField = new autocomplete.GeocoderAutocomplete(
        container.value,
        props.apiKey,
        props.options
      );

      // The library calls the Geocoding API (Autocomplete) as the user types.
      // On selection, pass the GeoJSON feature to the parent component
      autocompleteField.on("select", (place) => emit("select", place));
    });

    // Remove the library's listeners and DOM when the component goes away
    onBeforeUnmount(() => {
      if (autocompleteField) autocompleteField.destroy();
    });

    return { container };
  },
  template: `<div ref="container" class="autocomplete-container"></div>`
};

// Parent component: an address form bound with v-model
const App = {
  components: { AddressAutocomplete },
  setup() {
    const address = reactive({
      street: "",
      housenumber: "",
      postcode: "",
      city: "",
      state: "",
      country: ""
    });

    const autocompleteOptions = {
      placeholder: "Start typing an address",
      skipIcons: true,
      // keep a house number or street the user typed, even if it's not in the map data
      allowNonVerifiedHouseNumber: true,
      allowNonVerifiedStreet: true
    };

    // Fill the form fields from the selected address
    function onAddressSelect(place) {
      if (!place) return; // the field was cleared: keep what's in the form
      const p = place.properties;
      address.street = p.street || "";
      address.housenumber = p.housenumber || "";
      address.postcode = p.postcode || "";
      address.city = p.city || p.town || p.village || "";
      address.state = p.state || "";
      address.country = p.country || "";
    }

    return { apiKey: yourAPIKey, address, autocompleteOptions, onAddressSelect };
  },
  template: `
    <main class="page">
      <h1>Address autocomplete in a Vue 3 component</h1>
      <p class="hint">Search for an address. The component emits the selected place and the form fills in. You can still edit every field.</p>

      <label class="label">Search address</label>
      <address-autocomplete
        :api-key="apiKey"
        :options="autocompleteOptions"
        @select="onAddressSelect"
      ></address-autocomplete>

      <form class="address-form" @submit.prevent>
        <div class="row">
          <label class="field wide">Street
            <input v-model="address.street" autocomplete="address-line1">
          </label>
          <label class="field narrow">House number
            <input v-model="address.housenumber">
          </label>
        </div>
        <div class="row">
          <label class="field narrow">Postcode
            <input v-model="address.postcode" autocomplete="postal-code">
          </label>
          <label class="field wide">City
            <input v-model="address.city" autocomplete="address-level2">
          </label>
        </div>
        <div class="row">
          <label class="field wide">State / Region
            <input v-model="address.state" autocomplete="address-level1">
          </label>
          <label class="field wide">Country
            <input v-model="address.country" autocomplete="country-name">
          </label>
        </div>
      </form>

      <div class="state">
        <div class="state-title">Form state in Vue</div>
        <pre>{{ JSON.stringify(address, null, 2) }}</pre>
      </div>
    </main>
  `
};

createApp(App).mount("#app");
