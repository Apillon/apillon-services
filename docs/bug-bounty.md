# Apillon Bug Bounty

_This documents Apillon's bug bounty process and how you can get rewarded for finding issues._

At Apillon we consider security as a top priority but bugs unfortunetly still happen.

If you discover a voulnerability we would like to know about it so we can take appropriate steps to fix it. We would like to ask for your help to better protect Apillons services.

We offer bug bounties for the accepted vulnerability reports. Please don't submit non-security bugs or feature requests as vulnerability reports.

The Bug Bounty program and any listed rewards are subject to change at any time.

## Scope of this bounty program

Help us find any problems with the [Apillon App](https://app.apillon.io/). Any reports and suggestions for code, operations, and style improvement will be appreciated and taken into consideration.

## Rules and rewards

- Issues that have already been published here or are already disclosed to the Apillon team are not eligible for rewards.
- Apillon team members are ineligible for rewards.
- Social engineering, XKCD#538 attacks, DOS attacks, bringing down RPC or underlying parachains, and other issues that are beyond the realm of the Apillon app are not in scope and will NOT be paid a reward.
- Source code of all the modules, readme files, and documentation are in scope.
- Only the latest released version of the app is in scope.
- The Apillon team has complete and final judgment on the acceptability of bug reports.
- E-mail your findings to [bugs@apillon.io](mailto:bugs@apillon.io).
- Do not take advantage of the vulnerability or problem you have discovered.
- Do not reveal the problem to others until it has been resolved.
- This program is governed under the laws of the Republic of Singapore, if there is a party that we are unable to pay due to trade embargoes or other restrictions, then we won't pay. But we are happy to cooperate by making alternate arrangements.

Following is a [risk rating model](https://www.owasp.org/index.php/OWASP_Risk_Rating_Methodology) that judges the severity of an issue based on its likelihood and impact.

|                 | LOW LIKELIHOOD  | :left_right_arrow: | HIGH LIKELIHOOD  |
| --------------- | --------------- | ------------------ | ---------------- |
| **HIGH IMPACT** | Medium severity | High severity      | Highest severity |
| :arrow_up_down: | Low severity    | Medium severity    | High severity    |
| **LOW IMPACT**  | _Notable_       | Low severity       | Medium severity  |

Rewards:

- **Highest severity** — full payout of the bug bounty (50,000 NCTR)
- **High severity** — partial payout of the bug bounty (10,000 NCTR)
- **Medium severity** — partial payout of the bug bounty (1,000 NCTR)
- Eligible reports for medium, high, and highest severity will be mentioned in this thread in a leaderboard if they so how wish
- The most active contributors will be rewarded at Apillon's sole discretion, which also applies to contributors reporting low severity bugs.+

Examples of impact:

- _High impact_ — retrieve sensitive data such as API keys, blockchain private keys etc. (this does not include non-sensitive data), taking down the application/website, taking state-modifying authenticates actions on behalf of other users
- _Medium impact_ — change sensitive data of other users, improperly disclosing user information
- _Low impact_ — iframing leading to modifying the backend/browser state (must demonstrate impact with PoC), taking over broken or expired outgoing links such as, temporarily disabling user to access target site
- _Notable_ — typos, missing comments, mistakes in documentations, SPF/DMARC, missing http headers without demonstrated impact, ui/ux best practices recommendations

Examples of likelihood:

- _High likelihood_ — affects all users
- _Medium likelihood_ — affects a number of end users in a scenario that actually happens naturally in production deployments,
- _Low likelihood_ — affects two end users only if they are cooperating together to exploit a specially crafted mutation,
- _Notable_ — affects developers and grammarians but not end users.

How to win:

- Be descriptive and detailed when reporting your issue,
- Fix it — recommend a way to solve the problem,

## Scope

- [Apillon Website](https://apillon.io/)
- [Apillon APP](https://app.apillon.io/)
- [Apillon API](https://api.apillon.io/)
- [Apillon SDK](https://github.com/Apillon/sdk)
- [Apillon CLI](https://github.com/Apillon/sdk)

## More questions

- If you prefer to send us a bug report privately so that a fix can be developed concurrently with the announcement you are welcome to mail us at [info@apillon.io](mailto:info@apillon.io). You are welcome to make a hashed bug report (set issue body to hash of your message). This will still be eligible for payment and recognition.

* Taxes?
  - If you earn so much money that you will need to fill out a tax form, then we will ask you to do so. This program is subject to the laws of the Republic of Singapore.

Released under the [AGPL License](LICENSE).
