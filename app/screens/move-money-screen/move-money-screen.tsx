import messaging from "@react-native-firebase/messaging"
import * as React from "react"
import { useEffect, useState } from "react"
import {
  AppState,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from "react-native"
import { Button } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
import { TouchableWithoutFeedback } from "react-native-gesture-handler"
import Modal from "react-native-modal"
import Icon from "react-native-vector-icons/Ionicons"
import { getBuildNumber } from "react-native-device-info"
import { BalanceHeader } from "../../components/balance-header"
import { IconTransaction } from "../../components/icon-transactions"
import { LargeButton } from "../../components/large-button"
import { Screen } from "../../components/screen"
import { TransactionItem } from "../../components/transaction-item"
import { translate } from "../../i18n"
import { color } from "../../theme"
import { palette } from "../../theme/palette"
import { AccountType } from "../../utils/enum"
import { isIos } from "../../utils/helper"
import { ScreenType } from "../../types/jsx"
import useToken from "../../utils/use-token"
import { StackNavigationProp } from "@react-navigation/stack"
import { MoveMoneyStackParamList } from "../../navigation/stack-param-lists"
import useMainQuery from "@app/hooks/use-main-query"

const styles = EStyleSheet.create({
  balanceHeader: {
    marginBottom: "32rem",
  },

  bottom: {
    alignItems: "center",
    marginVertical: "16rem",
  },

  buttonContainerStyle: {
    marginTop: "16rem",
    width: "80%",
  },

  buttonStyle: {
    borderColor: color.primary,
    borderRadius: 32,
    borderWidth: 2,
  },

  buttonStyleTime: {
    backgroundColor: palette.white,
    borderRadius: "38rem",
    width: "50rem",
  },

  cover: { height: "100%", width: "100%" },

  divider: { flex: 1 },

  error: { alignSelf: "center", color: palette.red, paddingBottom: 18 },

  flex: {
    flex: 1,
  },

  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
  },

  icon: { height: 34, top: -22 },

  lightningText: {
    fontSize: "16rem",
    marginBottom: 12,
    textAlign: "center",
  },

  listContainer: {
    marginTop: "24rem",
  },

  menuIcon: {
    color: palette.darkGrey,
  },

  modal: { marginBottom: 0, marginHorizontal: 0 },

  screenStyle: {
    backgroundColor: palette.lighterGrey,
  },

  separator: { marginTop: 32 },

  text: {
    color: palette.darkGrey,
    fontSize: "20rem",
    // fontWeight: "bold",
  },

  titleStyle: {
    color: color.primary,
    fontSize: "18rem",
    fontWeight: "bold",
  },

  transactionsView: {
    flex: 1,
    marginHorizontal: "30rem",
  },

  viewModal: {
    alignItems: "center",
    backgroundColor: palette.white,
    height: "25%",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
  },
})

type MoveMoneyScreenDataInjectedProps = {
  navigation: StackNavigationProp<MoveMoneyStackParamList, "moveMoney">
}

export const MoveMoneyScreenDataInjected: ScreenType = ({
  navigation,
}: MoveMoneyScreenDataInjectedProps) => {
  const { hasToken } = useToken()

  const {
    mobileVersions,
    transactionsEdges,
    errors,
    loading: loadingMain,
    refetch,
  } = useMainQuery()

  // temporary fix until we have a better management of notifications:
  // when coming back to active state. look if the invoice has been paid
  useEffect(() => {
    const _handleAppStateChange = async (nextAppState) => {
      if (nextAppState === "active") {
        // TODO: fine grain query
        // only refresh as necessary
        refetch()
      }
    }
    const subscription = AppState.addEventListener("change", _handleAppStateChange)
    return () => subscription.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (_remoteMessage) => {
      // TODO: fine grain query
      // only refresh as necessary
      refetch()
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function isUpdateAvailableOrRequired(mobileVersions) {
    try {
      const minSupportedVersion = mobileVersions?.find(
        (mobileVersion) => mobileVersion?.platform === Platform.OS,
      ).minSupported
      const currentSupportedVersion = mobileVersions?.find(
        (mobileVersion) => mobileVersion?.platform === Platform.OS,
      ).currentSupported
      const buildNumber = Number(getBuildNumber())
      return {
        required: buildNumber < minSupportedVersion,
        available: buildNumber < currentSupportedVersion,
      }
    } catch (err) {
      return {
        // TODO: handle required upgrade
        required: false,
        available: false,
      }
    }
  }

  return (
    <MoveMoneyScreen
      navigation={navigation}
      loading={loadingMain}
      errors={errors}
      refetch={refetch}
      transactionsEdges={transactionsEdges}
      isUpdateAvailable={isUpdateAvailableOrRequired(mobileVersions).available}
      hasToken={hasToken}
    />
  )
}

type MoveMoneyScreenProps = {
  navigation: StackNavigationProp<MoveMoneyStackParamList, "moveMoney">
  loading: boolean
  errors: []
  transactionsEdges: { cursor: string; node: WalletTransaction | null }[]
  refetch: () => void
  isUpdateAvailable: boolean
  hasToken: boolean
}

export const MoveMoneyScreen: ScreenType = ({
  navigation,
  loading,
  errors,
  refetch,
  transactionsEdges,
  isUpdateAvailable,
  hasToken,
}: MoveMoneyScreenProps) => {
  const [modalVisible, setModalVisible] = useState(false)

  const onMenuClick = (target) => {
    hasToken ? navigation.navigate(target) : setModalVisible(true)
  }

  const activateWallet = () => {
    setModalVisible(false)
    navigation.navigate("phoneValidation")
  }

  // const testflight = "https://testflight.apple.com/join/9aC8MMk2"
  const appstore = "https://apps.apple.com/app/bitcoin-beach-wallet/id1531383905"

  // from https://github.com/FiberJW/react-native-app-link/blob/master/index.js
  const openInStore = async ({
    // appName,
    // appStoreId,
    // appStoreLocale = "us",
    playStoreId,
  }) => {
    if (isIos) {
      Linking.openURL(appstore)
      // Linking.openURL(`https://itunes.apple.com/${appStoreLocale}/app/${appName}/id${appStoreId}`);
    } else {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${playStoreId}`)
    }
  }

  const linkUpgrade = () =>
    openInStore({
      // appName: "Bitcoin Beach Wallet",
      // appStoreId: "",
      playStoreId: "com.galoyapp",
    }).catch((err) => {
      console.log({ err }, "error app link on link")
      // handle error
    })

  let recentTRansactionsData = undefined

  if (hasToken && transactionsEdges) {
    recentTRansactionsData = {
      title: translate("TransactionScreen.title"),
      target: "transactionHistory",
      icon: <Icon name="ios-list-outline" size={32} color={palette.black} />,
      style: "transactionViewContainer",
      details: (
        <View style={styles.transactionsView}>
          {transactionsEdges.map(
            ({ node }) =>
              node && (
                <TransactionItem
                  key={`transaction-${node.id}`}
                  navigation={navigation}
                  tx={node}
                  subtitle
                />
              ),
          )}
        </View>
      ),
    }
  }

  return (
    <Screen style={styles.screenStyle}>
      <StatusBar backgroundColor={palette.lighterGrey} barStyle="dark-content" />
      <Modal
        style={styles.modal}
        isVisible={modalVisible}
        swipeDirection={modalVisible ? ["down"] : ["up"]}
        onSwipeComplete={() => setModalVisible(false)}
        swipeThreshold={50}
      >
        <View style={styles.flex}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.cover} />
          </TouchableWithoutFeedback>
        </View>
        <View style={styles.viewModal}>
          <Icon
            name="ios-remove"
            size={64}
            color={palette.lightGrey}
            style={styles.icon}
          />
          <Text style={styles.text}>{translate("common.needWallet")}</Text>
          <Button
            title={translate("common.openWallet")}
            onPress={activateWallet}
            type="outline"
            buttonStyle={styles.buttonStyle}
            titleStyle={styles.titleStyle}
            containerStyle={styles.buttonContainerStyle}
          />
          <View style={styles.divider} />
        </View>
      </Modal>
      <View style={styles.header}>
        <Button
          buttonStyle={styles.buttonStyleTime}
          containerStyle={styles.separator}
          onPress={() =>
            navigation.navigate("priceDetail", {
              account: AccountType.Bitcoin,
            })
          }
          icon={<Icon name="ios-trending-up-outline" size={32} style={styles.menuIcon} />}
        />
        <BalanceHeader loading={loading} style={styles.balanceHeader} />
        <Button
          buttonStyle={styles.buttonStyleTime}
          containerStyle={styles.separator}
          onPress={() => navigation.navigate("settings")}
          icon={<Icon name="ios-settings-outline" size={32} style={styles.menuIcon} />}
        />
      </View>

      <FlatList
        ListHeaderComponent={() => (
          <>
            {errors?.map(({ message }, item) => (
              <Text key={`error-${item}`} style={styles.error} selectable>
                {message}
              </Text>
            ))}
          </>
        )}
        data={[
          {
            title: translate("ScanningQRCodeScreen.title"),
            target: "scanningQRCode",
            icon: <Icon name="qr-code" size={32} color={palette.orange} />,
          },
          {
            title: translate("MoveMoneyScreen.send"),
            target: "sendBitcoin",
            icon: <IconTransaction isReceive={false} size={32} />,
          },
          {
            title: translate("MoveMoneyScreen.receive"),
            target: "receiveBitcoin",
            icon: <IconTransaction isReceive size={32} />,
          },
          recentTRansactionsData,
        ]}
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        renderItem={({ item }) =>
          item && (
            <>
              <LargeButton
                title={item.title}
                icon={item.icon}
                onPress={() => onMenuClick(item.target)}
                style={item.style}
              />
              {item.details}
            </>
          )
        }
      />
      <View style={styles.bottom}>
        {isUpdateAvailable && (
          <Pressable onPress={linkUpgrade}>
            <Text style={styles.lightningText}>
              {translate("MoveMoneyScreen.updateAvailable")}
            </Text>
          </Pressable>
        )}
      </View>
    </Screen>
  )
}
