import { AdminOnly, useActiveNetwork } from "@3rdweb-sdk/react";
import { Code, Divider, Flex, Icon } from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import type { EditionDrop, NFTDrop } from "@thirdweb-dev/sdk";
import {
  formatError,
  formatResponseData,
} from "components/contract-functions/interactive-abi-function";
import { CodeSegment } from "components/contract-tabs/code/CodeSegment";
import { Environment } from "components/contract-tabs/code/types";
import { usePaperContractQuery } from "components/paper-xyz/hooks";
import { PaperRegisterContractButton } from "components/paper-xyz/register-contract-button";
import { PaperKYBButton } from "components/paper-xyz/verify-button";
import { useLocalStorage } from "hooks/useLocalStorage";
import { useState } from "react";
import { FiCreditCard } from "react-icons/fi";
import invariant from "tiny-invariant";
import { Badge, Button, Card, CodeBlock, Heading, Text } from "tw-components";

export function usePaperJWT() {
  return useLocalStorage("paperxyz_jwt", "");
}

function useCreateCheckoutIntentMutation(contract: NFTDrop | EditionDrop) {
  return useMutation(async () => {
    invariant(contract, "Contract is not defined");
    return await contract.checkout.createLinkIntent({
      title: "thirdweb test checkout",
      contractArgs: {
        tokenId: "0",
      },
    });
  });
}

export const PaperCheckoutSetting: React.FC<{
  contract: NFTDrop | EditionDrop;
}> = ({ contract }) => {
  const activeNetwork = useActiveNetwork();
  const [jwt, setJWT] = usePaperJWT();

  const [environment, setEnvironment] = useState<Environment>("react");

  const { data } = usePaperContractQuery(jwt.data || "", contract.getAddress());

  const paperCheckoutId = data?.result?.id;

  const testCheckoutMutation = useCreateCheckoutIntentMutation(contract);
  return (
    <AdminOnly contract={contract}>
      <Card p={0}>
        <Flex direction="column">
          <Flex p={{ base: 6, md: 10 }} as="section" direction="column" gap={4}>
            <Flex direction="column" gap={1}>
              <Flex justify="space-between" align="center">
                <Heading size="title.md">Credit Card Checkout</Heading>
                {paperCheckoutId ? (
                  <Badge colorScheme="green">Enabled</Badge>
                ) : (
                  <Badge>Not enabled</Badge>
                )}
              </Flex>

              <Text fontStyle="italic">
                Enable your customers to pay with a Credit Card using paper.xyz
              </Text>

              {paperCheckoutId && (
                <Flex direction="column" gap={6}>
                  <Flex direction="column" gap={2}>
                    <Heading size="subtitle.sm">
                      Create a checkout link for your NFT
                    </Heading>
                    <CodeSegment
                      environment={environment}
                      setEnvironment={setEnvironment}
                      snippet={{
                        javascript: createCodeSnippet(
                          contract.getAddress(),
                          activeNetwork || "goerli",
                          "javascript",
                        ),
                        react: createCodeSnippet(
                          contract.getAddress(),
                          activeNetwork || "goerli",
                          "react",
                        ),
                      }}
                    />
                  </Flex>
                  <Card
                    as={Flex}
                    flexDirection="column"
                    gap={4}
                    alignItems="flex-start"
                  >
                    <Button
                      isLoading={testCheckoutMutation.isLoading}
                      onClick={() => testCheckoutMutation.mutate()}
                      leftIcon={<Icon as={FiCreditCard} />}
                      w="auto"
                    >
                      Create test checkout
                    </Button>
                    {testCheckoutMutation.error ? (
                      <>
                        <Divider />
                        <Heading size="label.sm">Error</Heading>
                        <Text
                          borderColor="borderColor"
                          as={Code}
                          px={4}
                          py={2}
                          w="full"
                          borderRadius="md"
                          color="red.500"
                          whiteSpace="pre-wrap"
                          borderWidth="1px"
                          position="relative"
                        >
                          {formatError(testCheckoutMutation.error as any)}
                        </Text>
                      </>
                    ) : testCheckoutMutation.data !== undefined ? (
                      <>
                        <Divider />
                        <Heading size="label.sm">Output</Heading>
                        <CodeBlock
                          onClick={() => {
                            window.open(testCheckoutMutation.data, "_blank");
                          }}
                          _hover={{ texteDecoration: "underline" }}
                          w="full"
                          position="relative"
                          language="json"
                          code={formatResponseData(testCheckoutMutation.data)}
                        />
                      </>
                    ) : null}
                  </Card>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Flex>

        {paperCheckoutId ? null : jwt.data ? (
          <PaperRegisterContractButton
            jwt={jwt.data}
            contractAddress={contract.getAddress()}
            borderRadius="xl"
            borderTopLeftRadius="0"
            borderTopRightRadius="0"
            w="full"
          />
        ) : (
          <PaperKYBButton
            onSuccess={(_jwt) => {
              setJWT(_jwt);
            }}
            borderRadius="xl"
            borderTopLeftRadius="0"
            borderTopRightRadius="0"
            w="full"
          />
        )}
      </Card>
    </AdminOnly>
  );
};

function createCodeSnippet(
  contractAddress: string,
  network: string,
  language: "javascript" | "react",
) {
  let code = "";
  if (language === "javascript") {
    code = `
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

async function createCheckoutIntent() {
  const sdk = new ThirdwebSDK("${network}");
 
  const contract = await sdk.getContract(
    "${contractAddress}",
  );

  return await contract.checkout.createLinkIntent({
    title: "My Contract Checkout",
  });
}
    
createCheckoutIntent().then((checkoutUrl) => {
  window.open(checkoutUrl, "_blank");
});    
    `;
  } else if (language === "react") {
    code = `
import { Web3Button } from "@thirdweb-dev/react";

function MyComponent() {
  return (
    <Web3Button
      address="${contractAddress}"
      onClick={async (contract) =>
        await contract.checkout.createLinkIntent({
          title: "My Contract Checkout",
        })
      }
      onSuccess={(checkoutUrl) => {
        window.open(checkoutUrl, "_blank");
      }}
    >
      Checkout
    </Web3Button>
  );
}
        `;
  }

  return code.trim();
}
