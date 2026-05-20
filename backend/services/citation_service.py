"""
Citation formatting service for manuscripts.
Supports APA, MLA, Chicago, and Harvard citation styles.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime


def get_author_last_name(authors: str) -> str:
    """Extract first author's last name from author string."""
    if not authors:
        return "Unknown"
    
    # Handle "Last, First" or "First Last" formats
    first_author = authors.split(';')[0].split(',')[0].strip()
    
    # If comma exists, it's "Last, First" format
    if ',' in authors:
        return first_author
    
    # Otherwise, assume "First Last" and take last word
    parts = first_author.split()
    return parts[-1] if parts else "Unknown"


def get_author_count(authors: str) -> int:
    """Count number of authors."""
    if not authors:
        return 0
    return len([a.strip() for a in authors.split(';') if a.strip()])


def format_authors_apa(authors: str, max_authors: int = 20) -> str:
    """Format authors in APA style."""
    if not authors:
        return "Unknown Author"
    
    author_list = [a.strip() for a in authors.split(';') if a.strip()]
    count = len(author_list)
    
    if count == 0:
        return "Unknown Author"
    elif count == 1:
        return author_list[0]
    elif count == 2:
        return f"{author_list[0]} & {author_list[1]}"
    elif count <= max_authors:
        return ", ".join(author_list[:-1]) + f", & {author_list[-1]}"
    else:
        return f"{author_list[0]} et al."


def format_authors_mla(authors: str) -> str:
    """Format authors in MLA style."""
    if not authors:
        return "Unknown Author"
    
    author_list = [a.strip() for a in authors.split(';') if a.strip()]
    count = len(author_list)
    
    if count == 0:
        return "Unknown Author"
    elif count == 1:
        return author_list[0]
    elif count == 2:
        return f"{author_list[0]}, and {author_list[1]}"
    else:
        return f"{author_list[0]}, et al."


def format_authors_chicago(authors: str) -> str:
    """Format authors in Chicago style."""
    return format_authors_mla(authors)


def format_authors_harvard(authors: str) -> str:
    """Format authors in Harvard style."""
    return format_authors_apa(authors)


def format_inline_citation(publication: Dict[str, Any], style: str, order: int) -> str:
    """
    Format inline citation based on style.
    
    Args:
        publication: Publication data dict
        style: Citation style (APA, MLA, Chicago, Harvard)
        order: Citation order number
        
    Returns:
        Formatted inline citation string
    """
    authors = publication.get('authors', '')
    year = publication.get('year', 'n.d.')
    
    last_name = get_author_last_name(authors)
    author_count = get_author_count(authors)
    
    style = style.upper()
    
    if style == 'APA':
        if author_count == 0:
            return f"(Unknown, {year})"
        elif author_count == 1:
            return f"({last_name}, {year})"
        elif author_count == 2:
            authors_list = [a.strip() for a in authors.split(';')]
            last_name_2 = get_author_last_name(authors_list[1])
            return f"({last_name} & {last_name_2}, {year})"
        else:
            return f"({last_name} et al., {year})"
    
    elif style == 'MLA':
        if author_count == 0:
            return "(Unknown)"
        elif author_count == 1:
            return f"({last_name})"
        elif author_count == 2:
            authors_list = [a.strip() for a in authors.split(';')]
            last_name_2 = get_author_last_name(authors_list[1])
            return f"({last_name} and {last_name_2})"
        else:
            return f"({last_name} et al.)"
    
    elif style == 'CHICAGO':
        return f"[{order}]"
    
    elif style == 'HARVARD':
        if author_count == 0:
            return f"(Unknown {year})"
        elif author_count == 1:
            return f"({last_name} {year})"
        elif author_count == 2:
            authors_list = [a.strip() for a in authors.split(';')]
            last_name_2 = get_author_last_name(authors_list[1])
            return f"({last_name} and {last_name_2} {year})"
        else:
            return f"({last_name} et al. {year})"
    
    return f"[{order}]"


def format_bibliography_entry(publication: Dict[str, Any], style: str, order: Optional[int] = None) -> str:
    """
    Format full bibliography entry based on style.
    
    Args:
        publication: Publication data dict
        style: Citation style (APA, MLA, Chicago, Harvard)
        order: Citation order number (for Chicago)
        
    Returns:
        Formatted bibliography entry
    """
    title = publication.get('title', 'Untitled')
    authors = publication.get('authors', 'Unknown Author')
    year = publication.get('year', 'n.d.')
    journal = publication.get('journal', '')
    doi = publication.get('doi', '')
    
    style = style.upper()
    
    if style == 'APA':
        formatted_authors = format_authors_apa(authors)
        entry = f"{formatted_authors} ({year}). {title}."
        if journal:
            entry += f" <em>{journal}</em>."
        if doi:
            entry += f" https://doi.org/{doi}"
        return entry
    
    elif style == 'MLA':
        formatted_authors = format_authors_mla(authors)
        entry = f"{formatted_authors}. \"{title}.\""
        if journal:
            entry += f" <em>{journal}</em>,"
        entry += f" {year}."
        if doi:
            entry += f" doi:{doi}."
        return entry
    
    elif style == 'CHICAGO':
        formatted_authors = format_authors_chicago(authors)
        prefix = f"{order}. " if order else ""
        entry = f"{prefix}{formatted_authors}. \"{title}.\""
        if journal:
            entry += f" <em>{journal}</em>"
        entry += f" ({year})."
        if doi:
            entry += f" https://doi.org/{doi}."
        return entry
    
    elif style == 'HARVARD':
        formatted_authors = format_authors_harvard(authors)
        entry = f"{formatted_authors} ({year}) {title}."
        if journal:
            entry += f" <em>{journal}</em>."
        if doi:
            entry += f" Available at: https://doi.org/{doi}"
        return entry
    
    return f"{authors} ({year}). {title}."


def generate_bibliography(citations: List[Dict[str, Any]], style: str) -> str:
    """
    Generate complete bibliography HTML.
    
    Args:
        citations: List of citation dicts with publication data
        style: Citation style (APA, MLA, Chicago, Harvard)
        
    Returns:
        HTML string for bibliography section
    """
    style = style.upper()
    
    # Sort citations based on style
    if style in ['APA', 'MLA', 'HARVARD']:
        # Alphabetical by author
        sorted_citations = sorted(
            citations,
            key=lambda c: get_author_last_name(c.get('publication', {}).get('authors', ''))
        )
    else:  # Chicago - by order
        sorted_citations = sorted(citations, key=lambda c: c.get('order', 0))
    
    # Generate heading
    if style == 'MLA':
        heading = "Works Cited"
    elif style == 'CHICAGO':
        heading = "Bibliography"
    else:
        heading = "References"
    
    # Build HTML
    html = f'<h2 class="bibliography-heading">{heading}</h2>\n'
    html += '<div class="bibliography-entries">\n'
    
    for idx, citation in enumerate(sorted_citations, 1):
        publication = citation.get('publication', {})
        order = citation.get('order', idx) if style == 'CHICAGO' else None
        entry = format_bibliography_entry(publication, style, order)
        html += f'  <p class="bibliography-entry">{entry}</p>\n'
    
    html += '</div>'
    
    return html


def generate_citation_key(authors: str, year: int, existing_keys: List[str]) -> str:
    """
    Generate unique citation key (e.g., Smith2023, Smith2023a).
    
    Args:
        authors: Author string
        year: Publication year
        existing_keys: List of already used citation keys
        
    Returns:
        Unique citation key
    """
    last_name = get_author_last_name(authors)
    base_key = f"{last_name}{year}"
    
    if base_key not in existing_keys:
        return base_key
    
    # Add suffix a, b, c, etc.
    suffix = ord('a')
    while f"{base_key}{chr(suffix)}" in existing_keys:
        suffix += 1
        if suffix > ord('z'):
            # Fallback to numbers if we run out of letters
            num = 1
            while f"{base_key}{num}" in existing_keys:
                num += 1
            return f"{base_key}{num}"
    
    return f"{base_key}{chr(suffix)}"
