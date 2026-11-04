package choreshttp

import ("encoding/json"; "net/http"; "strings"; choresapp "github.com/clementortiz/home-ai/home-core/internal/chores/application")
type Handler struct { service *choresapp.Service }
func NewHandler(service *choresapp.Service) *Handler { return &Handler{service} }
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) { path:=strings.TrimPrefix(r.URL.Path,"/v1/chores/"); if r.Method==http.MethodGet && (path=="" || path=="/") { write(w,http.StatusOK,map[string]any{"chores":h.service.List()});return }; if r.Method==http.MethodPatch && strings.HasSuffix(path,"/completion") { id:=strings.TrimSuffix(path,"/completion"); var body struct{Completed bool `json:"completed"`}; if json.NewDecoder(r.Body).Decode(&body)!=nil { write(w,http.StatusBadRequest,map[string]string{"error":"invalid_request"});return }; chore,err:=h.service.SetCompleted(strings.Trim(id,"/"),body.Completed);if err!=nil {write(w,http.StatusNotFound,map[string]string{"error":"not_found"});return};write(w,http.StatusOK,chore);return }; write(w,http.StatusNotFound,map[string]string{"error":"not_found"}) }
func write(w http.ResponseWriter,status int,body any){w.Header().Set("Content-Type","application/json; charset=utf-8");w.WriteHeader(status);_ = json.NewEncoder(w).Encode(body)}
