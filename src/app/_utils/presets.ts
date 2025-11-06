export type Preset = { label: string, simf: string, args: string, wit: string }

export const PRESETS: Record<string, Preset> = {
  p2pk: {
    label: 'p2pk',
    simf: `/*
 * PAY TO PUBLIC KEY
 *
 * The coins move if the person with the given public key signs the transaction.
 *
 * https://docs.ivylang.org/bitcoin/language/ExampleContracts.html#lockwithpublickey
 */
fn main() {
    jet::bip_0340_verify((param::ALICE_PUBLIC_KEY, jet::sig_all_hash()), witness::ALICE_SIGNATURE)
}`.trim(),
    args: `{
  "ALICE_PUBLIC_KEY": {
    "value": "0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "type": "Pubkey"
  }
}`.trim(),
    wit: `{
  "ALICE_SIGNATURE": {
    "value": "0xf74b3ca574647f8595624b129324afa2f38b598a9c1c7cfc5f08a9c036ec5acd3c0fbb9ed3dae5ca23a0a65a34b5d6cccdd6ba248985d6041f7b21262b17af6f",
    "type": "Signature"
  }
}`.trim(),
  },
  p2pkh: {
    label: 'p2pkh',
    simf: `/*
 * PAY TO PUBLIC KEY HASH
 *
 * The coins move if the person with the public key that matches the given hash
 * signs the transaction.
 *
 * https://docs.ivylang.org/bitcoin/language/ExampleContracts.html#lockwithpublickeyhash
 */
fn sha2(string: u256) -> u256 {
    let hasher: Ctx8 = jet::sha_256_ctx_8_init();
    let hasher: Ctx8 = jet::sha_256_ctx_8_add_32(hasher, string);
    jet::sha_256_ctx_8_finalize(hasher)
}

fn main() {
    let pk: Pubkey = witness::PK;
    let expected_pk_hash: u256 = 0x132f39a98c31baaddba6525f5d43f2954472097fa15265f45130bfdb70e51def; // sha2(1 * G)
    let pk_hash: u256 = sha2(pk);
    assert!(jet::eq_256(pk_hash, expected_pk_hash));

    let msg: u256 = jet::sig_all_hash();
    jet::bip_0340_verify((pk, msg), witness::SIG)
}`.trim(),
    args: `{}`,
    wit: `{
  "PK": {
    "value": "0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "type": "Pubkey"
  },
  "SIG": {
    "value": "0xf74b3ca574647f8595624b129324afa2f38b598a9c1c7cfc5f08a9c036ec5acd3c0fbb9ed3dae5ca23a0a65a34b5d6cccdd6ba248985d6041f7b21262b17af6f",
    "type": "Signature"
  }
}`.trim(),
  },
  p2ms: {
    label: 'p2ms (2-of-3)',
    simf: `/*
 * PAY TO MULTISIG
 *
 * The coins move if 2 of 3 people agree to move them. These people provide
 * their signatures, of which exactly 2 are required.
 *
 * https://docs.ivylang.org/bitcoin/language/ExampleContracts.html#lockwithmultisig
 */
fn not(bit: bool) -> bool {
    <u1>::into(jet::complement_1(<bool>::into(bit)))
}

fn checksig(pk: Pubkey, sig: Signature) {
    let msg: u256 = jet::sig_all_hash();
    jet::bip_0340_verify((pk, msg), sig);
}

fn checksig_add(counter: u8, pk: Pubkey, maybe_sig: Option<Signature>) -> u8 {
    match maybe_sig {
        Some(sig: Signature) => {
            checksig(pk, sig);
            let (carry, new_counter): (bool, u8) = jet::increment_8(counter);
            assert!(not(carry));
            new_counter
        }
        None => counter,
    }
}

fn check2of3multisig(pks: [Pubkey; 3], maybe_sigs: [Option<Signature>; 3]) {
    let [pk1, pk2, pk3]: [Pubkey; 3] = pks;
    let [sig1, sig2, sig3]: [Option<Signature>; 3] = maybe_sigs;

    let counter1: u8 = checksig_add(0, pk1, sig1);
    let counter2: u8 = checksig_add(counter1, pk2, sig2);
    let counter3: u8 = checksig_add(counter2, pk3, sig3);

    let threshold: u8 = 2;
    assert!(jet::eq_8(counter3, threshold));
}

fn main() {
    let pks: [Pubkey; 3] = [
        0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798, // 1 * G
        0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5, // 2 * G
        0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9, // 3 * G
    ];
    check2of3multisig(pks, witness::MAYBE_SIGS);
}`.trim(),
    args: `{}`,
    wit: `{
  "MAYBE_SIGS": {
    "value": "[Some(0xf74b3ca574647f8595624b129324afa2f38b598a9c1c7cfc5f08a9c036ec5acd3c0fbb9ed3dae5ca23a0a65a34b5d6cccdd6ba248985d6041f7b21262b17af6f), None, Some(0x29dbeab5628ae472bce3e08728ead1997ef789d4f04b5be39cc08b362dc229f553fd353f8a0acffdfbddd471d15a0dda3b306842416ff246bc07462e5667eb89)]",
    "type": "[Option<Signature>; 3]"
  }
}`.trim(),
  },
  last_will: {
    label: 'last_will (inherit)',
    simf: `/*
 * LAST WILL
 *
 * The inheritor can spend the coins if the owner doesn't move the them for 180
 * days. The owner has to repeat the covenant when he moves the coins with his
 * hot key. The owner can break out of the covenant with his cold key.
 */
fn checksig(pk: Pubkey, sig: Signature) {
    let msg: u256 = jet::sig_all_hash();
    jet::bip_0340_verify((pk, msg), sig);
}

// Enforce the covenant to repeat in the first output.
//
// Elements has explicit fee outputs, so enforce a fee output in the second output.
// Disallow further outputs.
fn recursive_covenant() {
    assert!(jet::eq_32(jet::num_outputs(), 2));
    let this_script_hash: u256 = jet::current_script_hash();
    let output_script_hash: u256 = unwrap(jet::output_script_hash(0));
    assert!(jet::eq_256(this_script_hash, output_script_hash));
    assert!(unwrap(jet::output_is_fee(1)));
}

fn inherit_spend(inheritor_sig: Signature) {
    let days_180: Distance = 25920;
    jet::check_lock_distance(days_180);
    let inheritor_pk: Pubkey = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798; // 1 * G
    checksig(inheritor_pk, inheritor_sig);
}

fn cold_spend(cold_sig: Signature) {
    let cold_pk: Pubkey = 0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5; // 2 * G
    checksig(cold_pk, cold_sig);
}

fn refresh_spend(hot_sig: Signature) {
    let hot_pk: Pubkey = 0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9; // 3 * G
    checksig(hot_pk, hot_sig);
    recursive_covenant();
}

fn main() {
    match witness::INHERIT_OR_NOT {
        Left(inheritor_sig: Signature) => inherit_spend(inheritor_sig),
        Right(cold_or_hot: Either<Signature, Signature>) => match cold_or_hot {
            Left(cold_sig: Signature) => cold_spend(cold_sig),
            Right(hot_sig: Signature) => refresh_spend(hot_sig),
        },
    }
}`.trim(),
    args: `{}`,
    wit: `{
  "INHERIT_OR_NOT": {
    "value": "Left(0x755201bb62b0a8b8d18fd12fc02951ea3998ba42bfc6664daaf8a0d2298cad43cdc21358c7c82f37654275dc2fea8c858adbe97bac92828b498a5a237004db6f)",
    "type": "Either<Signature, Either<Signature, Signature>>"
  }
}`.trim(),
  },
  htlc: {
    label: 'htlc (complete)',
    simf: `/*
 * HTLC (Hash Time-Locked Contract)
 *
 * The recipient can spend the coins by providing the secret preimage of a hash.
 * The sender can cancel the transfer after a fixed block height.
 *
 * HTLCs enable two-way payment channels and multi-hop payments,
 * such as on the Lightning network.
 *
 * https://docs.ivylang.org/bitcoin/language/ExampleContracts.html#htlc
 */
fn sha2(string: u256) -> u256 {
    let hasher: Ctx8 = jet::sha_256_ctx_8_init();
    let hasher: Ctx8 = jet::sha_256_ctx_8_add_32(hasher, string);
    jet::sha_256_ctx_8_finalize(hasher)
}

fn checksig(pk: Pubkey, sig: Signature) {
    let msg: u256 = jet::sig_all_hash();
    jet::bip_0340_verify((pk, msg), sig);
}

fn complete_spend(preimage: u256, recipient_sig: Signature) {
    let hash: u256 = sha2(preimage);
    let expected_hash: u256 = 0x66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925; // sha2([0x00; 32])
    assert!(jet::eq_256(hash, expected_hash));
    let recipient_pk: Pubkey = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798; // 1 * G
    checksig(recipient_pk, recipient_sig);
}

fn cancel_spend(sender_sig: Signature) {
    let timeout: Height = 1000;
    jet::check_lock_height(timeout);
    let sender_pk: Pubkey = 0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5; // 2 * G
    checksig(sender_pk, sender_sig)
}

fn main() {
    match witness::COMPLETE_OR_CANCEL {
        Left(preimage_sig: (u256, Signature)) => {
            let (preimage, recipient_sig): (u256, Signature) = preimage_sig;
            complete_spend(preimage, recipient_sig);
        },
        Right(sender_sig: Signature) => cancel_spend(sender_sig),
    }
}`.trim(),
    args: `{}`,
    wit: `{
  "COMPLETE_OR_CANCEL": {
    "value": "Left((0x0000000000000000000000000000000000000000000000000000000000000000, 0xf74b3ca574647f8595624b129324afa2f38b598a9c1c7cfc5f08a9c036ec5acd3c0fbb9ed3dae5ca23a0a65a34b5d6cccdd6ba248985d6041f7b21262b17af6f))",
    "type": "Either<(u256, Signature), Signature>"
  }
}`.trim(),
  },
  presigned_vault: {
    label: 'presigned_vault (hot)',
    simf: `/*
 * PRESIGNED VAULT
 *
 * The coins move after a timeout if the hot key signs.
 * Alternatively, the cold key can sweep the coins at any time.
 *
 * This contract can be used to construct a vault that works without covenants:
 * 1) The cold key creates a presigned transaction that moves the vaulted coins
 *    into the contract.
 * 2) The presigned transaction is kept alongside the hot key.
 * 3) To unvault the coins, the presigned transaction is broadcast. The coins
 *    move into the contract. The coins cannot be moved until the timeout.
 * 4) If the hot key is compromised, then the cold key can cancel the
 *    unvaulting process and move the coins into a new vault.
 * 5) After the timeout, the hot key can withdraw the coins.
 *
 * https://docs.ivylang.org/bitcoin/language/ExampleContracts.html#vaultspend
 */
fn checksig(pk: Pubkey, sig: Signature) {
    let msg: u256 = jet::sig_all_hash();
    jet::bip_0340_verify((pk, msg), sig);
}

fn complete_spend(hot_sig: Signature) {
    let timeout: Distance = 1000;
    jet::check_lock_distance(timeout);
    let hot_pk: Pubkey = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798; // 1 * G
    checksig(hot_pk, hot_sig);
}

fn cancel_spend(cold_sig: Signature) {
    let cold_pk: Pubkey = 0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5; // 2 * G
    checksig(cold_pk, cold_sig)
}

fn main() {
    match witness::HOT_OR_COLD {
        Left(hot_sig: Signature) => complete_spend(hot_sig),
        Right(cold_sig: Signature) => cancel_spend(cold_sig),
    }
}`.trim(),
    args: `{}`,
    wit: `{
  "HOT_OR_COLD": {
    "value": "Left(0xedb6865094260f8558728233aae017dd0969a2afe5f08c282e1ab659bf2462684c99a64a2a57246358a0d632671778d016e6df7381293dd5bb9f0999d38640d4)",
    "type": "Either<Signature, Signature>"
  }
}`.trim(),
  },
  escrow_with_delay: {
    label: 'escrow_with_delay (timeout)',
    simf: `/*
 * ESCROW WITH DELAY
 *
 * An escrow agent can approve the movement of coins in cooperation with the
 * sender or the recipient. The escrow agent cannot steal the coins for himself.
 * The sender can refund her coins after a timeout.
 *
 * https://docs.ivylang.org/bitcoin/language/ExampleContracts.html#escrowwithdelay
 */
fn not(bit: bool) -> bool {
    <u1>::into(jet::complement_1(<bool>::into(bit)))
}

fn checksig(pk: Pubkey, sig: Signature) {
    let msg: u256 = jet::sig_all_hash();
    jet::bip_0340_verify((pk, msg), sig);
}

fn checksig_add(counter: u8, pk: Pubkey, maybe_sig: Option<Signature>) -> u8 {
    match maybe_sig {
        Some(sig: Signature) => {
            checksig(pk, sig);
            let (carry, new_counter): (bool, u8) = jet::increment_8(counter);
            assert!(not(carry));
            new_counter
        }
        None => counter,
    }
}

fn check2of3multisig(pks: [Pubkey; 3], maybe_sigs: [Option<Signature>; 3]) {
    let [pk1, pk2, pk3]: [Pubkey; 3] = pks;
    let [sig1, sig2, sig3]: [Option<Signature>; 3] = maybe_sigs;

    let counter1: u8 = checksig_add(0, pk1, sig1);
    let counter2: u8 = checksig_add(counter1, pk2, sig2);
    let counter3: u8 = checksig_add(counter2, pk3, sig3);

    let threshold: u8 = 2;
    assert!(jet::eq_8(counter3, threshold));
}

fn transfer_spend(maybe_sigs: [Option<Signature>; 3]) {
    let sender_pk: Pubkey = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798; // 1 * G
    let recipient_pk: Pubkey = 0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5; // 2 * G
    let escrow_pk: Pubkey = 0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9; // 3 * G
    check2of3multisig([sender_pk, recipient_pk, escrow_pk], maybe_sigs);
}

fn timeout_spend(sender_sig: Signature) {
    let sender_pk: Pubkey = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798; // 1 * G
    checksig(sender_pk, sender_sig);
    let timeout: Distance = 1000;
    jet::check_lock_distance(timeout);
}

fn main() {
    match witness::TRANSFER_OR_TIMEOUT {
        Left(maybe_sigs: [Option<Signature>; 3]) => transfer_spend(maybe_sigs),
        Right(sender_sig: Signature) => timeout_spend(sender_sig),
    }
}`.trim(),
    args: `{}`,
    wit: `{
  "TRANSFER_OR_TIMEOUT": {
    "value": "Right(0xedb6865094260f8558728233aae017dd0969a2afe5f08c282e1ab659bf2462684c99a64a2a57246358a0d632671778d016e6df7381293dd5bb9f0999d38640d4)",
    "type": "Either<[Option<Signature>; 3], Signature>"
  }
}`.trim(),
  },
  transfer_with_timeout: {
    label: 'transfer_with_timeout (transfer)',
    simf: `/*
 * TRANSFER WITH TIMEOUT
 *
 * The coins move if the sender and recipient agree to move them.
 * If the recipient fails to cooperate, then the sender can recover
 * the coins unilaterally after a timeout.
 *
 * This contract can be used to construct a one-way payment channel:
 * The sender keeps increasing the amount of coins to the recipient,
 * signing updated transactions with each channel update. The recipient
 * broadcasts the transaction on the blockchain when they are ready.
 *
 * https://docs.ivylang.org/bitcoin/language/ExampleContracts.html#transferwithtimeout
 */
fn checksig(pk: Pubkey, sig: Signature) {
    let msg: u256 = jet::sig_all_hash();
    jet::bip_0340_verify((pk, msg), sig);
}

fn transfer_spend(sender_sig: Signature, recipient_sig: Signature) {
    let sender_pk: Pubkey = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798; // 1 * G
    checksig(sender_pk, sender_sig);
    let recipient_pk: Pubkey = 0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5; // 2 * G
    checksig(recipient_pk, recipient_sig);
}

fn timeout_spend(sender_sig: Signature) {
     let sender_pk: Pubkey = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798; // 1 * G
     checksig(sender_pk, sender_sig);
     let timeout: Height = 1000;
     jet::check_lock_height(timeout);
}

fn main() {
    let sender_sig: Signature = witness::SENDER_SIG;
    match witness::TRANSFER_OR_TIMEOUT {
        Some(recipient_sig: Signature) => transfer_spend(sender_sig, recipient_sig),
        None => timeout_spend(sender_sig),
    }
}`.trim(),
    args: `{}`,
    wit: `{
  "SENDER_SIG": {
    "value": "0xf74b3ca574647f8595624b129324afa2f38b598a9c1c7cfc5f08a9c036ec5acd3c0fbb9ed3dae5ca23a0a65a34b5d6cccdd6ba248985d6041f7b21262b17af6f",
    "type": "Signature"
  },
  "TRANSFER_OR_TIMEOUT": {
    "value": "Some(0xf914c88a1ee88b4b7b8eb5603b835fa879386af79628aa9435226f64bdd54313794b18e30437231897dab3861d92437e0efe03a4bb17e60e4369d192b0c61ecf)",
    "type": "Option<Signature>"
  }
}`.trim(),
  },
  non_interactive_fee_bump: {
    label: 'non_interactive_fee_bump',
    simf: `/*
 * NON-INTERACTIVE FEE BUMPING
 *
 * This feature allows anyone, including miners, to increase a transaction's fee by reducing the change amount,
 * following a predefined rule that adds 1 satoshi to the fee every second.
 *
 * Allowed modifications without affecting the signature:
 * - Increase the transaction's nLockTime, delaying its inclusion in a block.
 * - Decrease the change output or increase the fee output.
 *
 * This enables miners to maximize their fees from transactions without needing external fee bumping services like
 * sponsors, Child-Pays-For-Parent (CPFP), or anchor outputs, simplifying fee management for transaction inclusion.
 */

// This function computes a signature hash for transactions that allows non-interactive fee bumping.
// It omits certain fields from the transaction that can be modified by anyone,
// specifically nLockTime and change/fee outputs amounts.
fn sighash_tx_nifb() -> u256 {
    let ctx: Ctx8 = jet::sha_256_ctx_8_init();
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_4(ctx, jet::version());
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_32(ctx, jet::inputs_hash());
    // Note that nlocktime is not signed.
    // Add the hash of the first output (assumed the ONLY non-change output)
    let ctx: Ctx8 = match jet::output_hash(0) {
        Some(sighash : u256) => jet::sha_256_ctx_8_add_32(ctx, sighash),
        None => panic!(),
    };
    // Add all output script pubkeys to the hash, including change and fee outputs script pubkeys
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_32(ctx, jet::output_scripts_hash());
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_32(ctx, jet::input_utxos_hash());
    jet::sha_256_ctx_8_finalize(ctx)
}

// Combines the transaction hash with additional taproot-related data to form the overall transaction signature hash.
fn sighash_nifb() -> u256 {
    let ctx: Ctx8 = jet::sha_256_ctx_8_init();
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_32(ctx, jet::genesis_block_hash());
    // Add the transaction-specific hash computed earlier
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_32(ctx, sighash_tx_nifb());
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_32(ctx, jet::tap_env_hash());
    let ctx: Ctx8 = jet::sha_256_ctx_8_add_4(ctx, jet::current_index());
    jet::sha_256_ctx_8_finalize(ctx)
}

// Helper function to ensure the provided boolean value is not negative.
fn check_neg(v : bool) {
    assert!(jet::eq_8(jet::left_pad_low_1_8(<bool>::into(v)), 0));
}

// Enforces a linear increase in transaction fee over time by adjusting the maximum fee allowed before a transaction is mined.
fn total_fee_check() {
    let curr_time : u32 = jet::tx_lock_time();
    // [ELEMENTS]:Asset type for the transaction fee (explicitly specifying asset type, typically BTC asset)
    let fee_asset : ExplicitAsset = 0x0000000000000000000000000000000000000000000000000000000000000000;
    let fees : u64 = jet::total_fee(fee_asset);
    let time_at_broadcast : u32 = 1734967235; // Dec 23 ~8:33am PST
    let (carry, time_elapsed) : (bool, u32) = jet::subtract_32(curr_time, time_at_broadcast);
    check_neg(carry); // Check for negative time difference, which shouldn't happen
    let base_fee : u64 = 1000; // Base fee at the time of broadcast
    // Calculate the maximum allowed fee as a function of elapsed time
    let (carry, max_fee) : (bool, u64) = jet::add_64(base_fee, jet::left_pad_low_32_64(time_elapsed));
    check_neg(carry); // Ensure there's no overflow in fee calculation
    // Assert that the current fees are less than the maximum allowed fee
    assert!(jet::lt_64(fees, max_fee));
    // Optionally, you could limit the total fee here
}

fn main() {
    let sighash : u256 = sighash_nifb();
    total_fee_check();
    let alice_pk : Pubkey = 0x9bef8d556d80e43ae7e0becb3a7e6838b95defe45896ed6075bb9035d06c9964;
    jet::bip_0340_verify((alice_pk, sighash), witness::ALICE_SIGNATURE);
}`.trim(),
    args: `{}`,
    wit: `{
  "ALICE_SIGNATURE": {
    "value": "0xe6608ceb66f62896ca07661964dd2ab0867df94caaeb089ac09089d13c23cf64ee3a0d42f8f84c2f627d4230c9f357919c48a274117e38c9c3d32a0e87570b45",
    "type": "Signature"
  }
}`.trim(),
  }
}