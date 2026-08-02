import 'server-only'

/**
 * Virtual hosts for the pneumatic post terminal -- SERVER ONLY.
 *
 * These filesystems contain a flag, so shipping them to the browser would let a
 * player grep the bundle instead of running `cat robots.txt`. Keeping them here
 * means the terminal genuinely queries a remote host, which is also closer to
 * what the challenge is teaching.
 */
export interface VirtualHost {
  files: Record<string, string>
  headers: Record<string, string> | null
}

export const HOSTS: Record<string, VirtualHost> = {
  "tube.hollowgear.bh": {
    "files": {
      "index.html": "<h1>Hollow Gear Consortium</h1>\n<p>Shipping and Aether Haulage. Dock Nine, Vane Quay.</p>\n<p>Enquiries to the Clerk of Works.</p>",
      "contact.html": "<h1>Enquiries</h1>\n<p>Clerk of Works, Dock Nine. Hours: sixth bell to eleventh bell.</p>",
      "robots.txt": "User-agent: *\nDisallow: /vault-of-whispers/\nDisallow: /old-manifests/\n\n# Vault corridor is NOT for the indexing engines. -- Clerk",
      "/old-manifests/": "(empty -- swept clean)",
      "/vault-of-whispers/notes.txt": "Clerk's working notes, do not post publicly.\n\nRook has moved the Dock Nine manifest off the public run again.\nHe left the corridor countersign taped under the desk like a fool:\n\n  BRASS{disallowed_but_not_hidden}\n\nIf anyone ever reads the courtesy file we are finished."
    },
    "headers": null
  },
  "vault.hollowgear.bh": {
    "files": {
      "index.html": "<!-- nothing here but the door -->\n<h1>403 -- Corridor Sealed</h1>"
    },
    "headers": {
      "Server": "AetherTube/2.14 (Brasshaven)",
      "X-Powered-By": "DifferenceEngine 4",
      "X-Corridor-Warden": "clerk-of-works",
      "X-Brasshaven-Auth": "QlJBU1N7aGVhZGVyc19jYXJyeV9zZWNyZXRzfQ==",
      "Set-Cookie": "corridor=sealed; path=/"
    }
  }
}

export function hostByName(name: string): VirtualHost | null {
  return HOSTS[name] ?? null
}
