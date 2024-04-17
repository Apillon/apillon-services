import { EmailTemplate } from '@apillon/lib';

export function generateTemplateData(key: string, data: any) {
  const templateData = {
    [EmailTemplate.WELCOME]: {
      subject: 'One more step...',
      title: 'Welcome to Apillon!',
      text: `
      <p>
       We're excited that you recognize the value of Web3 building and what Apillon brings to the table.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Complete the registration',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.GENERATE_IDENTITY]: {
      subject: 'Your identity awaits!',
      title: 'Welcome to Apillon, please verify your identity!',
      text: `
      <p>
       We're excited that you recognized the value of Web3 building and what Apillon brings to the table.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText:
        'Complete the registration by creating a decentralized identity',
      text2: `
      <p>
        This process also creates a decentralized identity.
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.RESTORE_CREDENTIAL]: {
      subject: 'Credentials restoration',
      title: 'Dear Apillonian,',
      text: `
      <p>
        We have received your request to restore your authentication credentials.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Restore your credentials',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.REVOKE_DID]: {
      subject: 'Identity Revoke',
      title: 'Dear Apillonian,',
      text: `
      <p>
        We have received your request for identity revokation.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Revoke decentralized identity',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.DOWNLOAD_IDENTITY]: {
      subject: 'Download your identity',
      title: 'Dear Apillonian,',
      text: `
      <p>
        Your decentralized identity is ready. You can download your identity by clicking on the following link on the button.
        Please note that the link is only valid for 24 hours. After that, you will have to initiate the recovery process.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Download your decentralized identity',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.RESET_PASSWORD]: {
      subject: 'Forgot your password?',
      title: 'Dear Apillonian,',
      text: `
      <p>
        Let's get you a new password.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Reset your password',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.NEW_USER_ADDED_TO_PROJECT]: {
      subject: 'Join a project on Apillon!',
      title: 'Welcome to Apillon!',
      text: `
      <p>
        You have been invited to help on the project ${data.projectName}! But first, let's make you an account.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Create Apillon account',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.USER_ADDED_TO_PROJECT]: {
      subject: `Welcome aboard the ${data.projectName} project!`,
      title: 'Dear Apillonian,',
      text: `
      <p>
        You have been invited to join in on the project ${data.projectName}!
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Visit Apillon dashboard',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.CONTACT_US_FORM]: {
      subject: `Contact Form Entry by ${data.firstName} ${data.lastName}`,
      title: 'Contact Form Entry',
      text: `
      <p>
        <b>First name:</b> ${data.firstName}
      </p>
      <p>
        <b>Last name:</b> ${data.lastName}
      </p>
      <p>
        <b>E-mail:</b> ${data.email}
      </p>
      <p>
        <b>Company website:</b> ${data.website}
      </p>
      <p>
        <b>Country:</b> ${data.country}
      </p>
      <p>
        <b>Product of interest:</b> ${data.product}
      </p>
      <p>
        <b>Additional info:</b> ${data.additionalInfo}
      </p>
      `,
    },
    [EmailTemplate.WEBSITE_DEPLOYMENT_REJECTED]: {
      subject: 'Urgent: Action required regarding your recent deployment',
      title: 'Website deployment has been rejected',
      text: `
      <p>
        Dear Apillonian,
        <br/><br/>
        We regret to inform you that one of your recent deployments to the Apillon hosting and storage service has been automatically blocked due to a violation of Apillon's general terms and conditions.
      </p>
      <p>
        <br/>
        What to do:
        <br/>
        We kindly request that you promptly review the content of your last deployment. If you believe this action was taken in error, please respond to this email or reach out to us on Discord at your earliest convenience.
      </p>
      <p>
        <br/>
        Preventing future incidents:
        <br/>
        To ensure the continued use of our platform, we urge you to refrain from deploying any content that may be considered potentially malicious or otherwise unacceptable. Failure to comply with Apillon's terms and conditions may result in the disabling of your account.
      </p>
      <p>
        <br/><br/>
        We value the security and integrity of our platform, and we appreciate your cooperation in maintaining a safe environment for all Apillon users.
        <br/><br/>
        Thank you for your immediate attention to this matter.
        <br/>
        Apillon Support Team
      </p>
      `,
    },
    [EmailTemplate.STORAGE_QUOTA_EXCEEDED]: {
      subject: `Important: Your account quota is exceeding limit`,
      title: `Your account quota is exceeding limit`,
      text: `
      <p>Dear Apillonian,</p><br>

      <p>Your subscription to our platform has expired and has not been automatically renewed, or has been downgraded.</p><br>

      <p>The change in the subscription plan directly affects your account’s limits and quotas and may lead to breaking changes on your services, so please review the current status.</p><br>

      <p><strong>What does this change mean?</strong></p><br>
      <p>If your current usage continues to exceed the reduced quota, we will be unable to accommodate your storage or hosting needs. Your excess storage files will automatically removed and unpinned 30 days after your subscription expires. To prevent any loss of data, please review the status of your files and limits.</p><br>

      <p><strong>What can you do to prevent data loss?</strong></p><br>
      <p>We understand this may not be the news you were hoping for. However, we encourage you to take immediate action to prevent any potential data loss. Here are a few options:</p><br>
      <ul>
        <li>Renew your subscription to restore your previous quota amount.</li>
        <li>Free up storage space by deleting unnecessary files.</li>
      </ul><br>
      <p>Renewing your subscription is the quickest and easiest solution. It will not only restore your full storage quota but also provide you with all the premium features that come with an active subscription.</p><br>

      <p>On the other hand, if you choose not to renew, make sure you have enough storage space to accommodate your current usage. You can do this by regularly deleting unnecessary files from your storage.</p><br>

      <p>We hope you will consider these options and take action soon. Your satisfaction is our top priority, and we are here to assist you in any way we can.</p><br>

      <p>Thank you for choosing Apillon. We appreciate your understanding and cooperation.</p>
`,
    },
    [EmailTemplate.CRYPTO_PAYMENT_SUCCESSFUL]: {
      subject: `DOT Payment Confirmation`,
      title: `DOT Payment Confirmation`,
      text: `
      <p>Thank you for choosing Apillon services and making a successful payment using DOT.</p>

      <p>We are pleased to confirm that your payment for the credit package <strong>${data.description}</strong> was a success.</p><br>

      <p>Atttached you can find the invoice for your payment.</p><br>

      <p>If you have any questions or need further assistance, please do not hesitate to contact our support team at support@apillon.com.</p><br>

      <p>Sincerely,</p>
      <p>The Apillon Team</p>
`,
    },
    [EmailTemplate.CREDIT_BALANCE_BELOW_THRESHOLD]: {
      subject: `Important: Your credit balance is below threshold`,
      title: `Your credit balance is below threshold`,
      text: `
      <p>Dear Apillonian,</p><br>

      <p>Your project's credit balance is below the configured threshold. <p><br>
      <p>Credits are used to carry out various non-recurring actions on the Apillon platform. Paid functionalities will no longer be possible if the credit balance is too low.</p><br>

      <p>You can buy additional credits in the <a href="https://app.apillon.io/dashboard/payments">Billing and Usage section</a> with a credit card or with a crypto payment.</p><br>`,
      actionUrl: data.actionUrl,
      actionText: 'Buy additional credits',
      text2: `
      <p>The credit balance notification threshold can be configured in the <a href="https://app.apillon.io/dashboard/billing">credit settings</a> on the Apillon developer console.</p><br>
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.IPFS_BANDWIDTH_NEAR_QUOTA]: {
      subject: `Important: Your storage bandwidth is approaching the limit`,
      title: `Your storage bandwidth is approaching the limit`,
      text: `
      <p>Dear Apillonian,</p><br>

      <p>Your project has consumed almost all of this month's available storage bandwidth.<p><br>
      <p><b>Used storage bandwidth: ${data.usedBandwidth}${data.availableBandwidth}/</b></p><br><br>
      <p>If your project exceeds the storage bandwidth limit, the Apillon IPFS gateway will start to block requests. 
      This means that all files, NFT metadata, and, most importantly, all websites in this project will become inaccessible via the Apillon IPFS gateway.</p>

      <p>You can increase the available storage bandwidth by upgrading your subscription plan in the <a href="https://app.apillon.io/dashboard/payments">Billing and Usage section</a>.</p><br>`,
      actionUrl: data.actionUrl,
      actionText: 'Subscribe to plan',
      text2: `
      <p>You will receive another email if and when your project exceeds the storage bandwidth limit.</p><br>
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    [EmailTemplate.IPFS_BANDWIDTH_EXCEEDED_QUOTA]: {
      subject: `Important: Your storage bandwidth has exceeded the limit - Upgrade for continued access!`,
      title: `Your storage bandwidth has exceeded the limit - Upgrade for continued access!`,
      text: `
      <p>Dear Apillonian,</p><br>

      <p>Your project has consumed all of this month's available storage bandwidth.<p><br>
      <p><b>Used storage bandwidth: ${data.usedBandwidth}${data.availableBandwidth}/</b></p><br><br>
      <p>Apillon IPFS gateway will now start blocking requests for your content on IPFS. 
      All files, NFT metadata, and, most importantly, all websites in this project will become inaccessible via the Apillon IPFS gateway.</p>

      <p>You can increase the available storage bandwidth by upgrading your subscription plan in the <a href="https://app.apillon.io/dashboard/payments">Billing and Usage section</a>.</p><br>`,
      actionUrl: data.actionUrl,
      actionText: 'Subscribe to plan',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact us at <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
  };

  return templateData[key];
}
