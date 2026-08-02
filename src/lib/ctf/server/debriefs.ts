import 'server-only'

/**
 * Post-solve story beats -- SERVER ONLY.
 *
 * Debriefs are earned content and several of them are load-bearing: the Case III
 * telegraph debrief names TELEGRAPH GHOST, which is both that challenge's own
 * countersign and the Vigenere key for the finale. Shipping these to the browser
 * would hand over two flags to anyone who opened the bundle.
 */
const DEBRIEFS: Record<string, string> = {
  "c1-1": "Three crates of aether-coil. Enough to lift an airship, or drop one.\n\nThe signature at the bottom of the page is not a name. It is a small pressed stamp: a gear with the centre punched out. You have seen it once before, on a card in Cordelia's coat pocket, the week before she vanished.",
  "c1-2": "The tally is not a count of iron. It is a count of *keys*. Eight of them, cut and issued, and only seven ever returned to the rack.\n\nSomebody in the foundry is walking around with a key to something that has eight locks.",
  "c1-3": "Nightshade. One dram, paid in Guild scrip, collected in person.\n\nThe apothecary keeps a visitors' book. You will need to see it. But the name in that book will not be the one you expect, and it will take you three more cases to understand why.",
  "c2-1": "A typesetter's note, left on the plate:\n\n*\"Sup. Rook says pull the Dock Nine manifest from the public run. Second time this month. What is he shipping?\"*\n\nSuperintendent I. Rook. Write that name down. It is about to get a lot more interesting.",
  "c2-2": "The Clerk of Works is careless, frightened, and writing things down. That combination has solved more cases than brilliance ever has.\n\nRook is pulling the Dock Nine manifest off the public run. Whatever sails from Dock Nine is not meant to be counted.",
  "c2-3": "The door swings. Behind it: a manifest room, and rows of brass drawers, each one labelled with a date and a ship.\n\nAnd on the desk, still warm, a cup of tea. Somebody left in a hurry. Somebody knew you were coming.",
  "c3-1": "The lamplighter. Of course. He walks every street in the city, every night, and nobody looks twice at a man whose whole job is to be near a light.\n\nA perfect courier. You will find him on the Vance Road at midnight, and he will not be pleased to see you.",
  "c3-2": "TELEGRAPH GHOST.\n\nCordelia's handwriting is in the margin of the transcription, three words, pressed hard enough to score the paper:\n\n*\"They know. Run.\"*\n\nShe was here. She sat at this desk and read this drawer and then she went out into the fog.",
  "c3-3": "A meeting, beneath the clock at Iron Hollow.\n\nYou know the place. Everyone knows the place. It is the great pressure vault under the foundry, and it has eight locks, and seven of the keys are on a rack.",
  "c4-1": "Ignatius Rook. Superintendent of Dock Nine, signatory of the public notice, and the man holding the eighth key to a vault he does not own.\n\nYou have him. Or you have his name, which in this city is nine tenths of the same thing.",
  "c4-2": "The wheel clicks over and the seventh lock retracts with a sound like a swallowed word.\n\nOne lock left. And the last one does not take a key at all.",
  "c4-3": "The vault opens on a room the size of a chapel, and it is empty except for one thing.\n\nA chair, bolted to the floor. A length of cut rope. And Cordelia Vane's hat, upside down, with a folded paper inside it addressed to you in her hand.",
  "c5-1": "Nine airships. One purpose.\n\nThe aether-coil from the ledger, the nightshade from the apothecary, eight keys and a vault the size of a chapel -- and the Hollow Gear has nine ships fuelled and waiting at Dock Nine.\n\nOne document left.",
  "c5-2": "*Cordelia here. If you read this I am already aboard.*\n\nShe was not taken. She got on the ship.\n\nNine airships leave Dock Nine at dawn, and Cordelia Vane is on one of them, and the rope on the vault floor was cut from the inside. She did not need rescuing. She needed somebody clever enough to follow the paper trail, and patient enough to finish it, and she picked you when she hired you.\n\nOutside, the fog is going the colour of a bad photograph. Somewhere over the river, engines are turning over.\n\nThe lamps go out at dawn. You have until then to decide whether you are a detective who closes cases, or one who gets on the ship.\n\n**-- END OF THE BRASSHAVEN FILES --**",
}

export function debriefFor(challengeId: string): string {
  return DEBRIEFS[challengeId] ?? ''
}
