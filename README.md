# セットアップ方法

## 動作環境

- WSL2 Ubuntu 22.04

## 1. AWS認証情報の設定

- AWSアカウントでアクセスキーとシークレットキーを取得する
- `~/.aws/credentials`に以下のように設定する

    ```ini
    [kubell]
    aws_access_key_id = <アクセスキー>
    aws_secret_access_key = <シークレットキー>
    ```

- `~/.aws/config`に以下のように設定する

    ```ini
    [profile wordpress]
    region = ap-northeast-1
    output = json
    ```

## 2. Dev Containerの起動

- VSCodeで`devcontainer.json`を開く
- コマンドパレットを開き、`Dev Containers: Reopen in Container`を選択
- Dev Containerに接続していることを確認する

## 3. npm packageのインストール

- ターミナルで以下のコマンドを実行

    ```bash
    # cdkディレクトリに移動
    cd cdk
    # npm packageのインストール
    npm ci
    ```

## 4. CDKのブートストラップ

- ターミナルで以下のコマンドを実行

    ```bash
    cdk bootstrap --profile wordpress
    ```

## 6. CDKのデプロイ

- ターミナルで以下のコマンドを実行

    ```bash
    npm run deploy
    ```
