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
  });

  console.log("address: ", await biconomySmartAccount.getAccountAddress());
  return biconomySmartAccount;
}

async function sendToken() {
  const smartAccount = await createAccount();
  const receiver = "0xC3a005E15Cb35689380d9C1318e981BcA9339942";
  const tokenAddress = "0x444fc097faCcAc4876d4FB515F75Ba4f3751C2Be";
  const amount = "12000000000000000000"; // 12 tokens

  try {
    const bicoTokenInterface = new ethers.utils.Interface(abi);
    const data = bicoTokenInterface.encodeFunctionData("transfer", [
      receiver,
      amount,
    ]);
    const transaction = { to: tokenAddress, data };

    const userOp = await smartAccount.buildUserOp([transaction]);
    userOp.paymasterAndData = "0x";

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

sendToken();
