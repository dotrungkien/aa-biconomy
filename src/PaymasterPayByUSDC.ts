import { config } from "dotenv";

config();

import { IBundler, Bundler } from "@biconomy/bundler";
import { ethers } from "ethers";
import { ChainId } from "@biconomy/core-types";
import {
  ECDSAOwnershipValidationModule,
  DEFAULT_ECDSA_OWNERSHIP_MODULE,
} from "@biconomy/modules";

import {
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";

import {
  IPaymaster,
  IHybridPaymaster,
  SponsorUserOperationDto,
  BiconomyPaymaster,
  PaymasterConfig,
  PaymasterMode,
  PaymasterFeeQuote,
} from "@biconomy/paymaster";
import abi from "./BICOTKN.json";

const provider = new ethers.providers.JsonRpcProvider(
  "https://rpc.ankr.com/polygon_mumbai"
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

const bundler: IBundler = new Bundler({
  bundlerUrl:
    "https://bundler.biconomy.io/api/v2/80001/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
  chainId: ChainId.POLYGON_MUMBAI,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
});

const paymasterConfig: PaymasterConfig = {
  paymasterUrl: process.env.PAYMASTER_URL!,
};

const paymaster: IPaymaster = new BiconomyPaymaster(paymasterConfig);

async function createAccount() {
  const module = await ECDSAOwnershipValidationModule.create({
    signer: wallet,
    moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
  });

  let biconomySmartAccount = await BiconomySmartAccountV2.create({
    bundler,
    chainId: ChainId.POLYGON_MUMBAI,
    rpcUrl: "https://rpc.ankr.com/polygon_mumbai",
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    defaultValidationModule: module,
    activeValidationModule: module,
    paymaster,
  });

  console.log("address: ", await biconomySmartAccount.getAccountAddress());
  return biconomySmartAccount;
}

async function sendTokenPaymasterERC20() {
  const smartAccount = await createAccount();
  const receiver = "0xC3a005E15Cb35689380d9C1318e981BcA9339942";
  const tokenAddress = "0x444fc097faCcAc4876d4FB515F75Ba4f3751C2Be";
  const amount = "2000000000000000000";

  try {
    const bicoTokenInterface = new ethers.utils.Interface(abi);
    const data = bicoTokenInterface.encodeFunctionData("transfer", [
      receiver,
      amount,
    ]);
    const transaction = { to: tokenAddress, data };

    let userOp = await smartAccount.buildUserOp([transaction]);

    const bicoPaymaster =
      smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

    const feeQuotesResponse = await bicoPaymaster.getPaymasterFeeQuotesOrData(
      userOp,
      {
        mode: PaymasterMode.ERC20,
        tokenList: ["0xda5289fcaaf71d52a80a254da614a192b693e977"],
      }
    );

    const feeQuotes = feeQuotesResponse.feeQuotes as PaymasterFeeQuote[];
    const spender = feeQuotesResponse.tokenPaymasterAddress || "";
    const usdcFeeQuotes = feeQuotes[0];

    userOp = await smartAccount.buildTokenPaymasterUserOp(userOp, {
      feeQuote: usdcFeeQuotes,
      spender: spender,
      maxApproval: false,
    });

    let paymasterServiceData: SponsorUserOperationDto = {
      mode: PaymasterMode.ERC20,
      feeTokenAddress: usdcFeeQuotes.tokenAddress,
      smartAccountInfo: {
        name: "BICONOMY",
        version: "2.0.0",
      },
    };

    const paymasterAndDataWithLimits = await bicoPaymaster.getPaymasterAndData(
      userOp,
      paymasterServiceData
    );

    userOp.paymasterAndData = paymasterAndDataWithLimits.paymasterAndData;
    userOp.callGasLimit = paymasterAndDataWithLimits.callGasLimit;
    userOp.verificationGasLimit =
      paymasterAndDataWithLimits.verificationGasLimit;
    userOp.preVerificationGas = paymasterAndDataWithLimits.preVerificationGas;

    const userOpResponse = await smartAccount.sendUserOp(userOp);

    const transactionDetail = await userOpResponse.wait();

    console.log("transaction detail below");
    console.log(
      `https://mumbai.polygonscan.com/tx/${transactionDetail.receipt.transactionHash}`
    );
  } catch (error) {
    console.log(error);
  }
}

sendTokenPaymasterERC20();
