import { createContext, useContext, useMemo, useState } from "react";

interface ClientSearchContextType {
	searchTerm: string;
	setSearchTerm: (term: string) => void;
}

const ClientSearchContext = createContext<ClientSearchContextType | undefined>(
	undefined,
);

interface ClientSearchProviderProps {
	children: React.ReactNode;
}

export function ClientSearchProvider({ children }: ClientSearchProviderProps) {
	const [searchTerm, setSearchTerm] = useState("");

	// Memoize the context value to prevent unnecessary re-renders
	const value = useMemo(
		() => ({
			searchTerm,
			setSearchTerm,
		}),
		[searchTerm],
	);

	return (
		<ClientSearchContext.Provider value={value}>
			{children}
		</ClientSearchContext.Provider>
	);
}

export function useClientSearch() {
	const context = useContext(ClientSearchContext);
	if (context === undefined) {
		throw new Error(
			"useClientSearch must be used within a ClientSearchProvider",
		);
	}
	return context;
}
