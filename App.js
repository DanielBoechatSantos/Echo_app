import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import axios from "axios";
import io from "socket.io-client";
// --- NOVA IMPORTAÇÃO ---
// Para salvar o IP no armazenamento do celular.
import AsyncStorage from "@react-native-async-storage/async-storage";

const nome_app = " Echo";
const versao = " 1 (beta)";
const desenvolvimento = " Desenvolvido por Daniel Boechat";

// O IP padrão, caso nenhum seja salvo ainda.
const DEFAULT_SERVER_IP = "192.168.10.8";

export default function App() {
  const [screen, setScreen] = useState("login");
  // --- NOVOS ESTADOS ---
  const [serverIp, setServerIp] = useState(DEFAULT_SERVER_IP);
  const [ipInput, setIpInput] = useState(DEFAULT_SERVER_IP);
  const [showIpScreen, setShowIpScreen] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userLevel, setUserLevel] = useState(null);
  const [isMusician, setIsMusician] = useState(false);
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRouter, setIsRouter] = useState(false);
  const [routerUser, setRouterUser] = useState(null);
  const [searchText, setSearchText] = useState("");
  const socketRef = useRef(null);

  // --- O IP DO SERVIDOR AGORA É DINÂMICO ---
  const SERVER_URL = `http://${serverIp}:5000`;

  // Efeito para carregar o IP salvo ao iniciar o app
  useEffect(() => {
    const loadSavedIp = async () => {
      const savedIp = await AsyncStorage.getItem('server_ip');
      if (savedIp) {
        setServerIp(savedIp);
        setIpInput(savedIp);
      }
    };
    loadSavedIp();
  }, []);

  useEffect(() => {
    if (screen === "main") {
      setupSocket(username);
      fetchSongs();
    } else if (screen === "login" && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [screen]);

  const setupSocket = (currentUser) => {
    if (socketRef.current) {
        socketRef.current.disconnect();
    }
    const socket = io(SERVER_URL, { transports: ["websocket"], reconnectionAttempts: 5 });
    socket.on("connect", () => {
      console.log(`[Socket] Conectado a ${SERVER_URL}. ID: ${socket.id}`);
      if (currentUser) {
        socket.emit('identify', { username: currentUser });
      }
    });
    // (Restante do setupSocket sem alterações)
    socket.on("router_claimed", (data) => setRouterUser(data.router_user || null));
    socket.on("router_cleared", () => setRouterUser(null));
    socket.on("open_song", async (data) => {
      const { song_id } = data;
      console.log(`[ROUTER - RECEBIDO] Evento "open_song" recebido. ID: ${song_id}`);
      try {
        const res = await axios.get(`${SERVER_URL}/api/song/${song_id}`);
        setSelectedSong(res.data);
        setScreen("song");
      } catch (err) {
        console.warn("Erro ao buscar música via socket:", err.message);
      }
    });
    socket.on("disconnect", () => console.log("[Socket] Desconectado."));
    socketRef.current = socket;
  };
  
  // --- NOVA FUNÇÃO PARA SALVAR O IP ---
  const handleSaveIp = async () => {
    if (!ipInput) {
      Alert.alert("Erro", "O campo de IP não pode estar vazio.");
      return;
    }
    setLoading(true);
    await AsyncStorage.setItem('server_ip', ipInput);
    setServerIp(ipInput);
    setLoading(false);
    setShowIpScreen(false);
    Alert.alert("Sucesso!", `Endereço do servidor foi salvo como: ${ipInput}`);
  };


  async function doLogin() {
    if (!username || !password) {
      Alert.alert("Atenção", "Por favor, preencha o usuário e a senha.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${SERVER_URL}/api/login`, { username, password });
      if (response.data.status === "success") {
        setUserLevel(response.data.nivel);
        setScreen("main");
      } else {
         Alert.alert("Login Falhou", response.data.message || "Credenciais inválidas.");
      }
    } catch (error) {
      if (error.response) {
        Alert.alert("Login Falhou", "Usuário ou senha incorretos.");
      } else if (error.request) {
        Alert.alert("Erro de Conexão", `Não foi possível conectar ao servidor em ${SERVER_URL}. Verifique o IP, a rede Wi-Fi e o Firewall.`);
      } else {
        Alert.alert("Erro Inesperado", "Ocorreu um erro ao tentar fazer o login.");
      }
    } finally {
      setLoading(false);
    }
  }

  // (O resto das suas funções permanecem as mesmas, pois já usam a variável SERVER_URL)
  /**
 * Zera os estados do usuário e retorna para a tela de login.
 */
function doLogout() {
  setUsername("");
  setPassword("");
  setUserLevel(null);
  setIsRouter(false);
  setScreen("login");
}

/**
 * Busca a lista de músicas da API do servidor.
 */
async function fetchSongs() {
  setLoading(true);
  try {
    const res = await axios.get(`${SERVER_URL}/api/songs`);
    setSongs(res.data || []);
    setFilteredSongs(res.data || []);
  } catch (err) {
    console.error("Erro detalhado em fetchSongs:", err);
    if (err.response) {
      Alert.alert(
        "Erro do Servidor",
        `O servidor respondeu com um erro: ${err.response.status}.`
      );
    } else if (err.request) {
      Alert.alert(
        "Erro de Rede",
        `Não foi possível conectar ao servidor para buscar as músicas (${serverIp}). Verifique sua conexão e o IP.`
      );
    } else {
      Alert.alert(
        "Erro Inesperado",
        `Ocorreu um erro ao preparar a requisição: ${err.message}`
      );
    }
  } finally {
    setLoading(false);
  }
}

/**
 * Filtra a lista de músicas com base no texto digitado pelo usuário.
 */
function filterSongs(text) {
  setSearchText(text);
  const filtered = songs.filter(
    (song) =>
      song.titulo.toLowerCase().includes(text.toLowerCase()) ||
      song.banda.toLowerCase().includes(text.toLowerCase())
  );
  setFilteredSongs(filtered);
}

/**
 * Abre a tela de uma música selecionada e, se for o Router,
 * emite o evento para os outros dispositivos.
 */
async function openSongLocal(song) {
  setSelectedSong(song);
  setScreen("song");

  if (isRouter && socketRef.current && socketRef.current.connected) {
    console.log(
      `[ROUTER - ENVIADO] Enviando evento "open_song". ID: ${song.id}`
    );
    socketRef.current.emit("open_song", {
      song_id: song.id,
      user: username || "user",
    });
  }
}

/**
 * Reivindica ou libera o controle de "Router" via Socket.IO.
 */
function toggleRouter(shouldClaim) {
  if (!socketRef.current) {
    Alert.alert("Socket", "Conexão com servidor não estabelecida.");
    return;
  }

  console.log(
    `[ROUTER - AÇÃO] Tentando ${
      shouldClaim ? 'REIVINDICAR' : 'LIBERAR'
    } como: ${username}`
  );
  
  setIsRouter(shouldClaim);

  if (shouldClaim) {
    socketRef.current.emit("claim_router", { user: username || "user" });
  } else {
    socketRef.current.emit("release_router", {});
  }
}

  // --- NOVA TELA PARA CONFIGURAR O IP ---
  function renderIpConfigScreen() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={styles.card}>
            <Text style={styles.title2}>Configurar Servidor</Text>
            <Text style={styles.label}>Digite o endereço IP do computador onde o servidor está rodando.</Text>
            <TextInput
              style={styles.input}
              value={ipInput}
              onChangeText={setIpInput}
              placeholder="Ex: 192.168.10.8"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.modernButton} onPress={handleSaveIp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modernButton, {backgroundColor: '#6c757d', marginTop: 10}]} onPress={() => setShowIpScreen(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  function renderLogin() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={styles.card}>
            {/* --- BOTÃO DE ENGRENAGEM ADICIONADO --- */}
            <TouchableOpacity style={styles.settingsButton} onPress={() => setShowIpScreen(true)}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>

            <Text style={styles.title2}>Bem Vindo ao {nome_app}</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Usuário" placeholderTextColor="#aaa" autoCapitalize="none" />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Senha" placeholderTextColor="#aaa" secureTextEntry onSubmitEditing={doLogin} />
            <TouchableOpacity style={styles.modernButton} onPress={doLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.rodape}>IP do Servidor: {serverIp}</Text>
          <Text style={styles.rodape2}> {desenvolvimento}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // (As outras funções de renderização permanecem iguais)
  function renderMain() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Wrapper principal do conteúdo */}
      <View style={styles.mainContentWrapper}>
        <Text style={styles.title}>Lista de Músicas Disponíveis</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar música..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={filterSongs}
        />

        {/* Exibe o indicador de carregamento ou a lista */}
        {loading ? (
          <ActivityIndicator size="large" color="#1f6feb" />
        ) : (
          <FlatList
            data={filteredSongs}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.songCard}
                onPress={async () => {
                  try {
                    const res = await axios.get(
                      `${SERVER_URL}/api/song/${item.id}`
                    );
                    openSongLocal(res.data);
                  } catch (err) {
                    Alert.alert("Erro", "Não foi possível abrir música.");
                  }
                }}
              >
                <Text style={styles.songTitle}>{item.titulo}</Text>
                <Text style={styles.songBanda}>{item.banda}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Barra inferior com controles */}
        <View style={styles.bottomRow}>
          <View style={styles.rowBox}>
            <Text style={styles.label}>Músico</Text>
            <Switch value={isMusician} onValueChange={setIsMusician} />
          </View>

          {/* Botão de controle do Router (visível apenas para usuários com esse nível) */}
          {userLevel === 'Router' && (
            <View style={styles.rowBox}>
              <Button
                title={isRouter ? "Liberar" : "Reivindicar"}
                onPress={() => toggleRouter(!isRouter)}
                color="#1f6feb"
              />
            </View>
          )}
        </View>

        {/* Botão de Logout */}
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity style={styles.modernButtonRed} onPress={doLogout}>
            <Text style={styles.buttonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rodapé */}
      <View style={styles.footer}>
        <Text style={styles.rodape}>{desenvolvimento}</Text>
        <Text style={styles.rodape2}> Nome do App:{nome_app}</Text>
        <Text style={styles.rodape2}> Versão do App:{versao}</Text>
      </View>
    </SafeAreaView>
  );
}
  function renderSong() {
  if (!selectedSong) return null;
  
  // Limpa o conteúdo para garantir que não há espaços indesejados no início/fim
  const content = isMusician 
    ? (selectedSong.cifra || "Sem cifra disponível.").trim()
    : (selectedSong.letra || "Sem letra disponível.").trim();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContentWrapper}>
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Text style={styles.title}>{selectedSong.titulo}</Text>
          <Text style={styles.band}>{selectedSong.banda}</Text>
        </View>

        {/* AQUI ESTÁ A MUDANÇA PRINCIPAL:
          Garantimos que não há nenhum espaço ou quebra de linha
          entre o ScrollView e o Text.
        */}
        <ScrollView style={{ flex: 1, marginTop: 12 }}>
          <Text style={styles.songContent}>{content}</Text>
        </ScrollView>

        <View style={{ marginTop: 20 }}>
          <TouchableOpacity style={styles.modernButton} onPress={() => setScreen("main")}>
            <Text style={styles.buttonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.rodape}>{desenvolvimento}</Text>
        <Text style={styles.rodape2}> Nome do App:{nome_app}</Text>
        <Text style={styles.rodape2}> Versão do App:{versao}</Text>
      </View>
    </SafeAreaView>
  );
}

  if (showIpScreen) return renderIpConfigScreen();
  if (screen === "login") return renderLogin();
  if (screen === "main") return renderMain();
  if (screen === "song") return renderSong();

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1b2a", paddingTop: Platform.OS === 'android' ? 25 : 0, },
  contentWrapper: { flex: 1, justifyContent: "center", paddingHorizontal: 10, },
  mainContentWrapper: { flex: 1, paddingHorizontal: 10, paddingTop: 20, },
  footer: { paddingHorizontal: 10, paddingBottom: 10, },
  card: { backgroundColor: '#f8f8f8ff', borderRadius: 25, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16, textAlign: "center", },
  band: { fontSize: 14, fontWeight: "600", color: "#fff", marginBottom: 4, textAlign: "center", },
  title2: { fontSize: 22, fontWeight: "700", color: "#010711ff", marginBottom: 16, textAlign: "center", },
  rodape: { fontSize: 10, fontWeight: "700", color: "#fff", paddingTop: 10, textAlign: "center", },
  rodape2: { fontSize: 10, fontWeight: "700", color: "#fff", textAlign: "center", },
  input: { backgroundColor: "#080808ff", color: "#fff", borderRadius: 25, paddingHorizontal: 12, height: 44, marginBottom: 12, },
  searchInput: { backgroundColor: "#00060cff", color: "#fff", borderRadius: 25, paddingHorizontal: 12, height: 44, marginBottom: 12, },
  songCard: { backgroundColor: "#1b2a3a", padding: 12, borderRadius: 8, marginBottom: 10, },
  songTitle: { color: "#fff", fontSize: 16, },
  songBanda: { color: "#fff", fontSize: 8, },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#1b2a3a", padding: 12, borderRadius: 25, marginTop: 12, alignItems: 'center', },
  rowBox: { alignItems: "center", },
  label: { color: "#fff", marginBottom: 4, textAlign: 'center', paddingHorizontal: 10 },
  songContent: { color: "#fff", fontSize: 16, lineHeight: 24, },
  modernButton: { backgroundColor: '#1f6feb', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 20, },
  modernButtonRed: { backgroundColor: '#fa0303ff', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 100, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 20, },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
  // --- NOVOS ESTILOS ---
  settingsButton: { position: 'absolute', top: 10, right: 15, zIndex: 10 },
  settingsIcon: { fontSize: 24 },
});

