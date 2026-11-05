package application

import (
	"fmt"
	"github.com/clementortiz/home-ai/home-core/internal/chores/model"
	"time"
)

// DefaultChores is the shared household catalogue. Dates are anchored to the
// first matching day of the current year so the panel can expand the year week by week.
func DefaultChores(now time.Time) []model.Chore {
	items := []struct{ text, frequency string }{
		{"Faire la vaisselle / remplir et vider le lave-vaisselle", "daily"}, {"Nettoyer la table, le plan de travail et les plaques de cuisson", "daily"}, {"Nettoyer l’évier et la robinetterie", "every_3_days"}, {"Sortir les poubelles et le recyclage", "every_3_days"}, {"Nettoyer le micro-ondes et la crédence", "weekend"}, {"Nettoyer les façades et poignées des meubles", "every_15_days"}, {"Nettoyer le réfrigérateur et trier les aliments périmés", "monthly"}, {"Nettoyer le four et la hotte", "every_3_months"}, {"Détartrer la bouilloire et la machine à café", "every_3_months"}, {"Entretenir le lave-vaisselle (filtre, joints, cycle de nettoyage)", "monthly"},
		{"Rincer et racler les parois de douche", "daily"}, {"Nettoyer le lavabo, les robinets et le miroir", "weekend"}, {"Nettoyer la douche (receveur et parois)", "weekend"}, {"Nettoyer entièrement les WC (cuvette, abattant, extérieur)", "weekend"}, {"Nettoyer la brosse WC et son support", "every_15_days"}, {"Détartrer la douche, les robinets et les WC", "monthly"}, {"Nettoyer les bondes et siphons", "every_3_months"}, {"Nettoyer les joints de carrelage et vérifier les joints silicone", "every_3_months"}, {"Nettoyer les meubles et trier les produits de toilette", "every_3_months"},
		{"Aérer les pièces et faire le lit", "daily"}, {"Ranger les objets et vêtements qui traînent", "daily"}, {"Dépoussiérer les meubles, étagères et tables", "weekend"}, {"Nettoyer les écrans, miroirs et télécommandes", "every_15_days"}, {"Aspirer le canapé, les fauteuils et sous les meubles", "monthly"}, {"Laver les plaids, coussins et couvertures", "every_3_months"}, {"Nettoyer le matelas et laver les oreillers", "every_6_months"}, {"Trier et nettoyer les placards et rangements", "every_6_months"},
		{"Lancer les machines de linge", "every_3_days"}, {"Étendre, plier et ranger le linge", "every_3_days"}, {"Changer et laver les serviettes de bain", "every_3_days"}, {"Changer et laver les torchons et essuie-mains", "every_3_days"}, {"Changer et laver les draps et taies d’oreiller", "weekend"}, {"Laver les tapis de bain et les chiffons", "weekend"}, {"Entretenir le lave-linge (joint, bac, filtre, cycle d’entretien)", "monthly"},
		{"Passer l’aspirateur dans les pièces principales", "every_3_days"}, {"Passer l’aspirateur dans les chambres", "weekend"}, {"Laver les sols de tout le logement", "weekend"}, {"Nettoyer les plinthes, radiateurs et endroits difficiles d’accès", "every_3_months"}, {"Nettoyer les tapis en profondeur", "every_6_months"},
		{"Nettoyer les vitres, rebords et cadres de fenêtres", "every_3_months"}, {"Nettoyer les poignées de porte et interrupteurs", "weekend"}, {"Nettoyer les portes, volets et stores", "every_6_months"}, {"Nettoyer les grilles de ventilation et de VMC", "every_3_months"}, {"Nettoyer les filtres de climatisation", "every_3_months"},
		{"Nettoyer les poubelles et bacs de tri", "monthly"}, {"Entretenir l’aspirateur et le matériel de ménage", "monthly"}, {"Faire les courses et vérifier les stocks", "weekend"}, {"Trier les vêtements, chaussures et objets inutilisés", "every_6_months"}, {"Vérifier les fuites, joints et équipements du logement", "every_6_months"}, {"Faire un grand nettoyage derrière les meubles et électroménagers", "every_6_months"},
	}
	anchor := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	result := make([]model.Chore, 0, len(items))
	for i, item := range items {
		result = append(result, model.Chore{ID: fmt.Sprintf("chore-%d", i+1), Objective: item.text, Date: anchor.Format("2006-01-02"), Assignees: []string{"Lise", "Clément"}, Frequency: item.frequency, Alternating: true})
	}
	return result
}
