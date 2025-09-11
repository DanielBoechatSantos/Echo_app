// App.js
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
} from "react-native";
import axios from "axios";
import io from "socket.io-client";

// importar usuários
import { USERS } from "./users";

const SERVER_URL = "http://192.168.10.8:5000";

export default function App() {
  const [screen, setScreen] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isMusician, setIsMusician] = useState(false);
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRouter, setIsRouter] = useState(false);
  const [routerUser, setRouterUser] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [role, setRole] = useState(null); // <- novo estado para guardar tipo de usuário

  const socketRef = useRef(null);

  // ---------------- LOGIN -----------------
  function doLogin() {
    const foundUser = USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (foundUser) {
      setRole(foundUser.role);
      setScreen("main");
      setLoading(true);
      fetchSongs().finally(() => setLoading(false));
    } else {
      Alert.alert("Login falhou", "Usuário ou senha inválidos.");
    }
  }

// ---------------- LOGOUT -----------------
  function logout() {
    setUsername("");
    setPassword("");
    setRole(null);
    setIsRouter(false);
    setRouterUser(null);
    setSelectedSong(null);
    setScreen("login");
  }

  async function fetchSongs() {
    try {
      const res = await axios.get(`${SERVER_URL}/api/songs`);
      setSongs(res.data || []);
      setFilteredSongs(res.data || []);
    } catch (err) {
      Alert.alert(
        "Erro",
        "Não foi possível listar músicas. Verifique o servidor e o IP em SERVER_URL."
      );
    }
  }

  function filterSongs(text) {
    setSearchText(text);
    const filtered = songs.filter((song) =>
      song.titulo.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredSongs(filtered);
  }

  async function openSongLocal(song) {
    setSelectedSong(song);
    setScreen("song");

    if (isRouter && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("open_song", {
        song_id: song.id,
        user: username || "user",
      });
    }
  }

  function toggleRouter(shouldClaim) {
    if (!socketRef.current) {
      Alert.alert("Socket", "Conexão com servidor não estabelecida.");
      return;
    }

    setIsRouter(shouldClaim);

    if (shouldClaim) {
      socketRef.current.emit("claim_router", { user: username || "user" });
    } else {
      socketRef.current.emit("release_router", {});
    }
  }

  function renderLogin() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuário"
        placeholderTextColor="#999"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Entrar" onPress={doLogin} color="#1f6feb" />
    </SafeAreaView>
  );
}

  // ---------------- MAIN -----------------
  function renderMain() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Lista de Músicas Disponíveis ({role === "router" ? "Router" : "Público"})
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar música..."
        placeholderTextColor="#666"
        value={searchText}
        onChangeText={filterSongs}
      />

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
                  const song = res.data;
                  openSongLocal(song);
                } catch (err) {
                  Alert.alert("Erro", "Não foi possível abrir música.");
                }
              }}
            >
              <Text style={styles.songTitle}>{item.titulo}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.bottomRow}>
        <View style={styles.rowBox}>
          <Text style={styles.label}>Músico</Text>
          <Switch value={isMusician} onValueChange={setIsMusician} />
        </View>

        {role === "router" && (
          <View style={styles.rowBox}>
            <Text style={styles.label}>Router: {routerUser || "—"}</Text>
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
        <Button title="Sair" onPress={logout} color="red" />
      </View>
    </SafeAreaView>
  );
}

  function renderSong() {
  if (!selectedSong)
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Nenhuma música selecionada</Text>
        <Button title="Voltar" onPress={() => setScreen("main")} />
        <Button title="Sair" onPress={logout} color="red" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{selectedSong.titulo}</Text>
      <ScrollView style={{ flex: 1, marginTop: 12 }}>
        <Text style={styles.songContent}>
          {isMusician
            ? selectedSong.cifra || "Sem cifra disponível."
            : selectedSong.letra || "Sem letra disponível."}
        </Text>
      </ScrollView>
      <Button title="Voltar" onPress={() => setScreen("main")} />
      <View style={{ marginTop: 10 }}>
        <Button title="Sair" onPress={logout} color="red" />
      </View>
    </SafeAreaView>
  );
}

  if (screen === "login") return renderLogin();
  if (screen === "main") return renderMain();
  if (screen === "song") return renderSong();
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 50,
    backgroundColor: "#0d1b2a",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1b2a3a",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#1b2a3a",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  songCard: {
    backgroundColor: "#1b2a3a",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  songTitle: {
    color: "#fff",
    fontSize: 16,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#162536",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  rowBox: {
    alignItems: "center",
  },
  label: {
    color: "#fff",
    marginBottom: 4,
  },
  songContent: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
  },
});
