package com.studyflow.integration.ai;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

/** Validates short-lived object-storage URLs before Java sends them to Python. */
public final class AiDocumentUrlPolicy {
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "::1", "[::1]");

    private AiDocumentUrlPolicy() { }

    /**
     * Args: signedUrl is the object-storage download URI; allowInsecureLocalHttp enables local HTTP only.
     * Input: an absolute URI without user information or fragment. Output: the same validated URI.
     * Errors: IllegalArgumentException when the URI is malformed, uses an unsupported scheme, or attempts
     * insecure HTTP outside a literal loopback host.
     */
    public static URI requireAllowed(URI signedUrl, boolean allowInsecureLocalHttp) {
        if (signedUrl == null
                || !signedUrl.isAbsolute()
                || signedUrl.getHost() == null
                || signedUrl.getHost().isBlank()
                || signedUrl.getUserInfo() != null
                || signedUrl.getFragment() != null) {
            throw new IllegalArgumentException(
                    "Signed document URL must be absolute and must not contain user info or a fragment");
        }

        String scheme = signedUrl.getScheme().toLowerCase(Locale.ROOT);
        if ("https".equals(scheme)) return signedUrl;
        String host = signedUrl.getHost().toLowerCase(Locale.ROOT);
        if ("http".equals(scheme) && allowInsecureLocalHttp && LOOPBACK_HOSTS.contains(host)) {
            return signedUrl;
        }
        throw new IllegalArgumentException(
                "Signed document URL must use HTTPS; local HTTP requires an explicit loopback-only opt-in");
    }
}
