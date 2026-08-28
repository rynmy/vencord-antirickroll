import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadKnownHosts() {
    const source = readFileSync(new URL("./knownHosts.ts", import.meta.url), "utf8");
    const arraySource = source.match(/export const knownHosts = (\[[\s\S]*?\]);/s)?.[1];
    if (!arraySource) throw new Error("knownHosts array not found");
    return Function(`"use strict"; return (${arraySource});`)();
}

function loadMatcher() {
    const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
    const functionSource = source.match(
        /function isPotentialRickroll[\s\S]*?\n}\n\nfunction extractUrls/s
    )?.[0]
        .replace(/\n\nfunction extractUrls$/, "")
        .replace(
            "function isPotentialRickroll(url: string): boolean",
            "function isPotentialRickroll(url)"
        );
    if (!functionSource) throw new Error("isPotentialRickroll function not found");

    const settings = {
        store: {
            customLinks: "",
            customVideoIds: "",
        },
    };

    return Function(
        "settings",
        "knownHosts",
        "knownVideoIds",
        `"use strict"; ${functionSource}; return isPotentialRickroll;`
    )(settings, loadKnownHosts(), []);
}

test("matches an exact path-specific known URL without blocking the whole host", () => {
    const isPotentialRickroll = loadMatcher();

    assert.equal(
        isPotentialRickroll(
            "https://discord.com/vanityurl/dotcom/steakpants/flour/flower/index11.html"
        ),
        true
    );
    assert.equal(isPotentialRickroll("https://discord.com/channels/@me"), false);
});

test("matches the contributed bit.ly redirect without blocking other bit.ly links", () => {
    const isPotentialRickroll = loadMatcher();

    assert.equal(isPotentialRickroll("https://bit.ly/3vahOeT"), true);
    assert.equal(isPotentialRickroll("https://bit.ly/not-a-rickroll"), false);
});
