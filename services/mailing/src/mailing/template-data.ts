export function generateTemplateData(key: string, data: any) {
  const templateData = {
    welcome: {
      subject: 'Welcome to Apillon!',
      title: 'Welcome to Apillon!',
      text: `
      <p>
       We're excited that you recognized the value of Web3 building and what Apillon brings to the table.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Complete the registration',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    'generate-identity': {
      subject: 'Verify your identity!',
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
        If you need additional assistance, or you received this email in error, please contact <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    'restore-credential': {
      subject: 'Apillon credential restore!',
      title: 'Dear Apillon User',
      text: `
      <p>
        We have received your request to restore your authentication credential
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Restore your credential',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    'revoke-did': {
      subject: 'Apillon Identity Revoke!',
      title: 'Dear Apillon User',
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
    'reset-password': {
      subject: 'Apillon password reset!',
      title: 'Dear Apillon User',
      text: `
      <p>
        We have received your request to reset your password.
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Change your password',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    'new-user-added-to-project': {
      subject: 'You are invited to join the Apillon project!',
      title: 'Welcome to Apillon.io!',
      text: `
      <p>
        You have been invited to help on the project ${data.projectName}!
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Create Apillon account',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    'user-added-to-project': {
      subject: `Welcome aboard the ${data.projectName} project!`,
      title: 'Dear Apillon User',
      text: `
      <p>
        You have been invited to help on the project ${data.projectName}!
      </p>
      `,
      actionUrl: data.actionUrl,
      actionText: 'Visit Apillon dashboard',
      text2: `
      <p>
        If you need additional assistance, or you received this email in error, please contact <a href="mailto:info@apillon.io">info@apillon.io</a>.
        <br/><br/><br/>
        Cheers,<br/>
        The Apillon team
      </p>
      `,
    },
    'contact-us-form': {
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
        <b>Country:</b> ${data.firstName}
      </p>
      <p>
        <b>Product of interest:</b> ${data.product}
      </p>
      <p>
        <b>Additional info:</b> ${data.additionalInfo}
      </p>
      `,
    },
  };

  return templateData[key];
}
