// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import classnames from 'classnames';
import Button from 'react-polymorph/lib/components/Button';
import SimpleButtonSkin from 'react-polymorph/lib/skins/simple/ButtonSkin';
import Checkbox from 'react-polymorph/lib/components/Checkbox';
import SimpleTogglerSkin from 'react-polymorph/lib/skins/simple/TogglerSkin';
import Input from 'react-polymorph/lib/components/Input';
import NumericInput from 'react-polymorph/lib/components/NumericInput';
import SimpleInputSkin from 'react-polymorph/lib/skins/simple/InputSkin';
import { defineMessages, intlShape } from 'react-intl';
import BigNumber from 'bignumber.js';
import { isValidAmountInLovelaces } from '../../lib/validations';
import { DECIMAL_PLACES_IN_ADA } from '../../config/numbersConfig';
import ReactToolboxMobxForm from '../../lib/ReactToolboxMobxForm';
import AmountInputSkin from './skins/AmountInputSkin';
import BorderedBox from '../widgets/BorderedBox';
import styles from './WalletSendForm.scss';
import globalMessages from '../../i18n/global-messages';
import LocalizableError from '../../i18n/LocalizableError';

const messages = defineMessages({
  titleLabel: {
    id: 'wallet.send.form.title.label',
    defaultMessage: '!!!Title',
    description: 'Label for the "Title" text input in the wallet send form.'
  },
  titleHint: {
    id: 'wallet.send.form.title.hint',
    defaultMessage: '!!!E.g: Money for Frank',
    description: 'Hint inside the "Receiver" text input in the wallet send form.'
  },
  receiverLabel: {
    id: 'wallet.send.form.receiver.label',
    defaultMessage: '!!!Receiver',
    description: 'Label for the "Receiver" text input in the wallet send form.'
  },
  receiverHint: {
    id: 'wallet.send.form.receiver.hint',
    defaultMessage: '!!!Wallet Address',
    description: 'Hint inside the "Receiver" text input in the wallet send form.'
  },
  amountLabel: {
    id: 'wallet.send.form.amount.label',
    defaultMessage: '!!!Amount',
    description: 'Label for the "Amount" number input in the wallet send form.'
  },
  equalsAdaHint: {
    id: 'wallet.send.form.amount.equalsAda',
    defaultMessage: '!!!equals {amount} ADA',
    description: 'Convertion hint for the "Amount" number input in the wallet send form.'
  },
  descriptionLabel: {
    id: 'wallet.send.form.description.label',
    defaultMessage: '!!!Description',
    description: 'Label for the "description" text area in the wallet send form.'
  },
  descriptionHint: {
    id: 'wallet.send.form.description.hint',
    defaultMessage: '!!!You can add a message if you want',
    description: 'Hint in the "description" text area in the wallet send form.'
  },
  sendButtonLabel: {
    id: 'wallet.send.form.submit',
    defaultMessage: '!!!Send',
    description: 'Label for the send button on the wallet send form.'
  },
  invalidAddress: {
    id: 'wallet.send.form.errors.invalidAddress',
    defaultMessage: '!!!Please enter a valid address.',
    description: 'Error message shown when invalid address was entered.'
  },
  invalidAmount: {
    id: 'wallet.send.form.errors.invalidAmount',
    defaultMessage: '!!!Please enter a valid amount.',
    description: 'Error message shown when invalid amount was entered.',
  },
  invalidTitle: {
    id: 'wallet.send.form.errors.invalidTitle',
    defaultMessage: '!!!Please enter a title with at least 3 characters.',
    description: 'Error message shown when invalid transaction title was entered.',
  },
  walletPasswordLabel: {
    id: 'wallet.send.form.walletPasswordLabel',
    defaultMessage: '!!!Wallet password',
    description: 'Label for the "Wallet password" input in the wallet send form.'
  },
  passwordFieldPlaceholder: {
    id: 'wallet.send.form.passwordFieldPlaceholder',
    defaultMessage: '!!!Password',
    description: 'Placeholder for the "Password" inputs in the wallet send form.'
  },
  fees: {
    id: 'wallet.send.form.feesNote.fees',
    defaultMessage: '!!!Fees',
    description: '"Fees" word before the Included/Excluded toggler in the transaction fees "Fees Included/Excluded from the amount" note.'
  },
  included: {
    id: 'wallet.send.form.feesNote.included',
    defaultMessage: '!!!Included',
    description: '"Included" word from the Included/Excluded toggler in the transaction fees "Fees Included/Excluded from the amount" note.'
  },
  excluded: {
    id: 'wallet.send.form.feesNote.excluded',
    defaultMessage: '!!!Excluded',
    description: '"Excluded" word from the Included/Excluded toggler in the transaction fees "Fees Included/Excluded from the amount" note.'
  },
  fromTheAmount: {
    id: 'wallet.send.form.feesNote.fromTheAmount',
    defaultMessage: '!!!from the amount',
    description: '"from the amount" part after the Included/Excluded toggler in the transaction fees "Fees Included/Excluded from the amount" note.'
  },
});

messages.fieldIsRequired = globalMessages.fieldIsRequired;

@observer
export default class WalletSendForm extends Component {

  props: {
    onSubmit: Function,
    calculateTransactionFee: (receiver: string, amount: string) => Promise<BigNumber>,
    isSubmitting: boolean,
    addressValidator: Function,
    isWalletPasswordSet: boolean,
    error?: ?LocalizableError,
  };

  static contextTypes = {
    intl: intlShape.isRequired,
  };

  state = {
    transactionFee: new BigNumber(0),
    isTransactionFeeIncluded: false,
  };

  // We need to track the mounted state in order to avoid calling
  // setState promise handling code after the component was already unmounted:
  // Read more: https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  adaToLovelaces = (adaAmount: string) => (
    adaAmount.replace('.', '').replace(/,/g, '').replace(/^0+/, '')
  );

  onToggleTransactionFeeInclusion = (value: boolean) => {
    this.setState({ isTransactionFeeIncluded: value });
    // TODO: recalculate transaction fees!
  };

  // FORM VALIDATION
  form = new ReactToolboxMobxForm({
    fields: {
      receiver: {
        label: this.context.intl.formatMessage(messages.receiverLabel),
        placeholder: this.context.intl.formatMessage(messages.receiverHint),
        value: '',
        validators: ({ field }) => {
          const value = field.value;
          if (value === '') return [false, this.context.intl.formatMessage(messages.fieldIsRequired)];
          return this.props.addressValidator(field.value)
            .then(isValid => [isValid, this.context.intl.formatMessage(messages.invalidAddress)]);
        },
      },
      amount: {
        label: this.context.intl.formatMessage(messages.amountLabel),
        placeholder: '0.000000',
        value: '',
        validators: ({ field }) => {
          const amountValue = field.value;
          if (amountValue === '') {
            return [false, this.context.intl.formatMessage(messages.fieldIsRequired)];
          }
          const amountInLovelaces = this.adaToLovelaces(amountValue);
          const isValid = isValidAmountInLovelaces(amountInLovelaces);
          if (isValid) {
            this._calculateTransactionFee(this.form.$('receiver').bind().value, amountValue);
          }
          return [isValid, this.context.intl.formatMessage(messages.invalidAmount)];
        },
      },
      walletPassword: {
        type: 'password',
        label: this.context.intl.formatMessage(messages.walletPasswordLabel),
        placeholder: this.context.intl.formatMessage(messages.passwordFieldPlaceholder),
        value: '',
        validators: [({ field }) => {
          if (this.props.isWalletPasswordSet && field.value === '') {
            return [false, this.context.intl.formatMessage(messages.fieldIsRequired)];
          }
          return [true];
        }],
      },
    },
  }, {
    options: {
      validateOnChange: true,
      validationDebounceWait: 250,
    },
  });

  submit() {
    this.form.submit({
      onSuccess: (form) => {
        const { isWalletPasswordSet } = this.props;
        const { receiver, amount, walletPassword } = form.values();
        const transactionData = {
          receiver,
          amount: this.adaToLovelaces(amount),
          password: isWalletPasswordSet ? walletPassword : null,
        };
        this.props.onSubmit(transactionData);
      },
      onError: () => {}
    });
  }

  render() {
    const { form } = this;
    const { intl } = this.context;
    const { isWalletPasswordSet, isSubmitting, error } = this.props;
    const { transactionFee, isTransactionFeeIncluded } = this.state;
    const amountField = form.$('amount');
    const receiverField = form.$('receiver');
    const passwordField = form.$('walletPassword');
    const amountFieldProps = amountField.bind();
    const totalAmount = this._calculateTotalAmount(amountFieldProps.value, transactionFee);

    const buttonClasses = classnames([
      'primary',
      isSubmitting ? styles.submitButtonSpinning : styles.submitButton,
    ]);

    return (
      <div className={styles.component}>

        <BorderedBox>

          <div className={styles.receiverInput}>
            <Input
              className="receiver"
              {...receiverField.bind()}
              error={receiverField.error}
              skin={<SimpleInputSkin />}
            />
          </div>

          <div className={styles.amountInput}>
            <NumericInput
              {...amountFieldProps}
              className="amount"
              label={intl.formatMessage(messages.amountLabel)}
              minValue={0.000001}
              maxValue={45000000000}
              maxAfterDot={6}
              maxBeforeDot={11}
              error={amountField.error}
              // AmountInputSkin props
              currency={intl.formatMessage(globalMessages.unitAda)}
              fees={transactionFee.toFormat(DECIMAL_PLACES_IN_ADA)}
              total={totalAmount.toFormat(DECIMAL_PLACES_IN_ADA)}
              skin={<AmountInputSkin />}
            />

            <div className={styles.transactionFees}>
              <span className={styles.transactionFeesText}>
                {intl.formatMessage(messages.fees)}
              </span>
              <Checkbox
                className={styles.transactionFeesToggler}
                labelLeft={intl.formatMessage(messages.included)}
                labelRight={intl.formatMessage(messages.excluded)}
                onChange={this.onToggleTransactionFeeInclusion}
                checked={isTransactionFeeIncluded}
                skin={<SimpleTogglerSkin />}
              />
              <span className={styles.transactionFeesText}>
                {intl.formatMessage(messages.fromTheAmount)}
              </span>
            </div>
          </div>

          {isWalletPasswordSet ? (
            <div className={styles.passwordInput}>
              <Input
                className="walletPassword"
                {...passwordField.bind()}
                error={passwordField.error}
                skin={<SimpleInputSkin />}
              />
            </div>
          ) : null}

          {error ? <p className={styles.error}>{intl.formatMessage(error)}</p> : null}

          <Button
            className={buttonClasses}
            label={intl.formatMessage(messages.sendButtonLabel)}
            onMouseUp={this.submit.bind(this)}
            skin={<SimpleButtonSkin />}
          />

        </BorderedBox>

      </div>
    );
  }

  _calculateTransactionFee(receiver: string, amountValue: string) {
    this.setState({ transactionFee: new BigNumber(0) });
    const cleanedAmount = amountValue.replace(/,/g, '');
    const amount = new BigNumber(cleanedAmount !== '' ? cleanedAmount : 0);

    this.props.calculateTransactionFee(receiver, amount)
      .then((fee: BigNumber) => (
        this._isMounted && this.setState({ transactionFee: fee })
      ))
      .catch((error: Error) => {
        console.log(error);
      });
  }

  _calculateTotalAmount(amountValue: string, transactionFee: BigNumber): BigNumber {
    const cleanedAmount = amountValue.replace(/,/g, '');
    const amount = new BigNumber(cleanedAmount !== '' ? cleanedAmount : 0);
    return amount.add(transactionFee);
  }
}

