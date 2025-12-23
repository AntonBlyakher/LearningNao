/* SCORM 1.2 Wrapper (robust)
   - LMSInitialize / LMSGetValue / LMSSetValue / LMSCommit / LMSFinish
   - Error helpers
*/

const SCORM = (() => {
    let api = null;
    let initialized = false;

    function findAPI(win) {
        let attempts = 0;
        while (win && attempts < 500) {
            if (win.API) return win.API;
            if (win.parent && win.parent !== win) {
                win = win.parent;
            } else {
                break;
            }
            attempts++;
        }
        return null;
    }

    function getAPI() {
        if (api) return api;
        api = findAPI(window) || (window.opener ? findAPI(window.opener) : null);
        return api;
    }

    function init() {
        try {
            const a = getAPI();
            if (!a) return false;

            const res = a.LMSInitialize("");
            initialized = (res === "true");

            if (initialized) {
                const status = getValue("cmi.core.lesson_status");
                if (!status) {
                    setValue("cmi.core.lesson_status", "incomplete");
                    commit();
                }
            }

            return initialized;
        } catch {
            initialized = false;
            return false;
        }
    }

    function finish() {
        try {
            const a = getAPI();
            if (!a || !initialized) return false;

            a.LMSCommit("");
            const res = a.LMSFinish("");
            initialized = false;
            return (res === "true");
        } catch {
            return false;
        }
    }

    function commit() {
        try {
            const a = getAPI();
            if (!a || !initialized) return false;
            const res = a.LMSCommit("");
            return (res === "true");
        } catch {
            return false;
        }
    }

    function getValue(el) {
        try {
            const a = getAPI();
            if (!a || !initialized) return "";
            return a.LMSGetValue(el) || "";
        } catch {
            return "";
        }
    }

    function setValue(el, val) {
        try {
            const a = getAPI();
            if (!a || !initialized) return false;
            const res = a.LMSSetValue(el, String(val));
            return (res === "true");
        } catch {
            return false;
        }
    }

    function setStatus(status) {
        return setValue("cmi.core.lesson_status", status);
    }

    function setScore(raw0to100) {
        const v = Math.max(0, Math.min(100, Number(raw0to100)));
        return setValue("cmi.core.score.raw", v);
    }

    function getSuspendData() {
        return getValue("cmi.suspend_data");
    }

    function setSuspendData(jsonString) {
        const s = String(jsonString || "");
        return setValue("cmi.suspend_data", s.slice(0, 4096));
    }

    function isConnected() {
        return !!getAPI() && initialized;
    }

    return {
        init,
        commit,
        finish,
        getValue,
        setValue,
        isConnected,
        setStatus,
        setScore,
        getSuspendData,
        setSuspendData
    };
})();
