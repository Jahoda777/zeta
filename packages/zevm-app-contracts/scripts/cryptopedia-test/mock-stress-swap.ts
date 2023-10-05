import { MaxUint256 } from "@ethersproject/constants";
import { formatUnits, parseUnits } from "@ethersproject/units";
import { ethers } from "hardhat";

import { ERC20__factory, MockZETA, MockZETA__factory, UniswapV2Router02__factory } from "../../typechain-types";

export const getNow = async () => {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
};

const TOKEN_TO_MINT = parseUnits("100");
const tokenAddress1 = "0xAfB1ddBd7180f6E9054BE6A44bf2FDd08dd08a35";
const tokenAddress2 = "0x0278d356b23366037F8D3C34e3B387c971197EA2";

const uniswapRouterAddress = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";

const stressSwap = async () => {
  const [deployer] = await ethers.getSigners();

  const MockToken = await MockZETA__factory.connect(tokenAddress1, deployer);

  await MockToken.mint(deployer.address, TOKEN_TO_MINT);

  const uniswapRouter = await UniswapV2Router02__factory.connect(uniswapRouterAddress, deployer);

  const tokenContract1 = ERC20__factory.connect(tokenAddress1, deployer);

  const tokenContract2 = ERC20__factory.connect(tokenAddress2, deployer);

  const tx1 = await tokenContract1.approve(uniswapRouter.address, MaxUint256);
  await tx1.wait();

  const tx2 = await tokenContract2.approve(uniswapRouter.address, MaxUint256);
  await tx2.wait();

  const initialBalance1 = await tokenContract1.balanceOf(deployer.address);
  const initialBalance2 = await tokenContract2.balanceOf(deployer.address);
  console.log(`initialBalance1: ${initialBalance1.toString()}`);
  console.log(`initialBalance2: ${initialBalance2.toString()}`);

  const tx3 = await uniswapRouter.swapExactTokensForTokens(
    TOKEN_TO_MINT,
    0,
    [tokenAddress1, tokenAddress2],
    deployer.address,
    (await getNow()) + 360,
    { gasLimit: 10_000_000 }
  );
  await tx3.wait();

  const balanceAfterSwap1 = await tokenContract1.balanceOf(deployer.address);
  const balanceAfterSwap2 = await tokenContract2.balanceOf(deployer.address);
  console.log(`balanceAfterSwap1: ${balanceAfterSwap1.toString()}`);
  console.log(`balanceAfterSwap2: ${balanceAfterSwap2.toString()}`);

  const tx4 = await uniswapRouter.swapExactTokensForTokens(
    balanceAfterSwap2.sub(initialBalance2),
    0,
    [tokenAddress2, tokenAddress1],
    deployer.address,
    (await getNow()) + 360,
    { gasLimit: 10_000_000 }
  );

  await tx4.wait();

  const endBalance1 = await tokenContract1.balanceOf(deployer.address);
  const endBalance2 = await tokenContract2.balanceOf(deployer.address);
  console.log(`endBalance1: ${endBalance1.toString()}`);
  console.log(`endBalance2: ${endBalance2.toString()}`);

  await MockToken.burn(deployer.address, endBalance1);
};

stressSwap()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
