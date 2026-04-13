import { make_gcs_wrapper } from '@salusoft89/planegcs';

let wrapper = null;
let initPromise = null;

const GcsService = {
    async init() {
        if (initPromise) return initPromise;
        initPromise = (async () => {
            try {
                wrapper = await make_gcs_wrapper('/planegcs.wasm');
                console.log("[GcsService] PlaneGCS Wasm Initialized.");
                return true;
            } catch (err) {
                console.error("[GcsService] Failed to load Wasm:", err);
                initPromise = null;
                return false;
            }
        })();
        return initPromise;
    },

    isReady() {
        return !!wrapper;
    },

    /**
     * Solves a sketch using PlaneGCS primitives.
     * @param {Array} primitives - List of {id, type, ...props}
     * @returns {Array} - Solved geometry primitives with updated coordinates.
     */
    solveSync(primitives) {
        if (!wrapper) {
            return primitives;
        }

        try {
            wrapper.clear_data();
            wrapper.push_primitives_and_params(primitives);
            const status = wrapper.solve();
            // CRITICAL: apply_solution() writes the solved values back into the
            // sketch_index. Without this, get_primitives() returns original coords.
            wrapper.apply_solution();
            const result = wrapper.sketch_index.get_primitives();
            console.debug(`[GcsService] Solve complete - status: ${status}, primitives: ${primitives.length}`);
            return result;
        } catch (err) {
            console.error("[GcsService] PlaneGCS Solve Error:", err);
            return primitives;
        }
    }
};

export default GcsService;
